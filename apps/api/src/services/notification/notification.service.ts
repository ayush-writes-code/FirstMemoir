import { prisma } from '@repo/database';
import { INotificationService, ISmsProvider, IEmailProvider } from './notification.interface.js';
import { mockSmsProvider } from './providers/mock.sms.provider.js';
import { mockEmailProvider } from './providers/mock.email.provider.js';
import { ResendEmailProvider } from './providers/resend.email.provider.js';
import { emailTemplates } from './templates/email.templates.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';

export class NotificationService implements INotificationService {
  private smsProvider: ISmsProvider;
  private emailProvider: IEmailProvider;

  constructor(smsProvider: ISmsProvider, emailProvider: IEmailProvider) {
    this.smsProvider = smsProvider;
    this.emailProvider = emailProvider;
  }

  async dispatchOrderConfirmed(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true }
      });

      if (!order) return;

      const recipientPhone = order.customer_phone || order.user?.phone_number;
      const recipientEmail = order.customer_email;
      const customerName = (order.shipping_address_snapshot as any)?.name || 'Customer';

      if (recipientPhone) {
        await this.enqueueNotification({
          orderId: order.id,
          recipient: recipientPhone,
          channel: 'SMS',
          eventType: 'ORDER_CONFIRMED',
          payload: { message: `Your WePrintIt order #${order.id.slice(0, 8)} is confirmed!` },
        });
      }

      if (recipientEmail) {
        await this.enqueueNotification({
          orderId: order.id,
          recipient: recipientEmail,
          channel: 'EMAIL',
          eventType: 'ORDER_CONFIRMED',
          payload: { 
            subject: 'Order Confirmed - First Memoir', 
            body: emailTemplates.orderConfirmed(order.id, customerName)
          },
        });
      }
    } catch (error) {
      logger.error(error, '[NotificationService] Error in dispatchOrderConfirmed');
    }
  }

  async dispatchOrderProcessing(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true }
      });

      if (!order) return;

      const recipientPhone = order.customer_phone || order.user?.phone_number;

      if (recipientPhone) {
        await this.enqueueNotification({
          orderId: order.id,
          recipient: recipientPhone,
          channel: 'SMS',
          eventType: 'ORDER_PROCESSING',
          payload: { message: `Your WePrintIt order #${order.id.slice(0, 8)} is now being printed!` },
        });
      }
    } catch (error) {
      logger.error(error, '[NotificationService] Error in dispatchOrderProcessing');
    }
  }

  async dispatchOrderShipped(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true }
      });

      if (!order) return;

      const recipientEmail = order.customer_email;
      const customerName = (order.shipping_address_snapshot as any)?.name || 'Customer';
      const awbCode = order.tracking_awb || 'Pending';

      if (recipientEmail) {
        await this.enqueueNotification({
          orderId: order.id,
          recipient: recipientEmail,
          channel: 'EMAIL',
          eventType: 'ORDER_SHIPPED',
          payload: { 
            subject: 'Your Order has Shipped - First Memoir', 
            body: emailTemplates.orderShipped(order.id, customerName, awbCode)
          },
        });
      }
    } catch (error) {
      logger.error(error, '[NotificationService] Error in dispatchOrderShipped');
    }
  }

  async dispatchOrderDelivered(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true }
      });

      if (!order) return;

      const recipientEmail = order.customer_email;
      const customerName = (order.shipping_address_snapshot as any)?.name || 'Customer';

      if (recipientEmail) {
        await this.enqueueNotification({
          orderId: order.id,
          recipient: recipientEmail,
          channel: 'EMAIL',
          eventType: 'ORDER_DELIVERED',
          payload: { 
            subject: 'Your Order has been Delivered - First Memoir', 
            body: emailTemplates.orderDelivered(order.id, customerName)
          },
        });
      }
    } catch (error) {
      logger.error(error, '[NotificationService] Error in dispatchOrderDelivered');
    }
  }

  private async enqueueNotification(data: {
    orderId: string;
    recipient: string;
    channel: 'SMS' | 'EMAIL';
    eventType: string;
    payload: any;
  }) {
    try {
      const providerName = data.channel === 'SMS' ? this.smsProvider.name : this.emailProvider.name;
      const log = await prisma.notificationLog.create({
        data: {
          order_id: data.orderId,
          recipient: data.recipient,
          channel: data.channel,
          event_type: data.eventType,
          provider: providerName,
          status: 'PENDING',
          payload: data.payload,
        }
      });

      setImmediate(() => {
        this.processNotification(log.id).catch((err) => {
          logger.error(err, `[NotificationService] Unhandled async error processing notification ${log.id}`);
        });
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        logger.info(`[NotificationService] Idempotency guard: Skipping duplicate ${data.channel} notification for ${data.eventType} on order ${data.orderId}`);
        return;
      }
      logger.error(error, `[NotificationService] Error enqueuing notification for order ${data.orderId}`);
    }
  }

  private async processNotification(logId: string) {
    let log = await prisma.notificationLog.findUnique({ where: { id: logId } });
    if (!log || log.status !== 'PENDING') return;

    log = await prisma.notificationLog.update({
      where: { id: logId },
      data: { attempt_count: log.attempt_count + 1 }
    });

    try {
      let result;
      if (log.channel === 'SMS') {
        const payload = log.payload as any;
        result = await this.smsProvider.sendSms(log.recipient, payload.message);
      } else if (log.channel === 'EMAIL') {
        const payload = log.payload as any;
        result = await this.emailProvider.sendEmail(log.recipient, payload.subject, payload.body);
      } else {
        throw new Error(`Unsupported channel: ${log.channel}`);
      }

      if (result.success) {
        await prisma.notificationLog.update({
          where: { id: logId },
          data: {
            status: 'SENT',
            provider_ref: result.providerRef,
            sent_at: new Date()
          }
        });
      } else {
        await prisma.notificationLog.update({
          where: { id: logId },
          data: {
            status: 'FAILED',
            error_message: result.error || 'Provider returned failure without message'
          }
        });
      }
    } catch (error: any) {
      await prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: 'FAILED',
          error_message: error.message || String(error)
        }
      });
    }
  }
}

const activeEmailProvider = (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) 
  ? new ResendEmailProvider(env.RESEND_API_KEY, env.RESEND_FROM_EMAIL)
  : mockEmailProvider;

export const notificationService = new NotificationService(mockSmsProvider, activeEmailProvider);
