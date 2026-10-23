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
          payload: { message: `Your First Memoir order #${order.id.slice(0, 8)} is confirmed!` },
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
          payload: { message: `Your First Memoir order #${order.id.slice(0, 8)} is now being printed!` },
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
        const existing = await prisma.notificationLog.findFirst({
          where: {
            order_id: data.orderId,
            channel: data.channel,
            event_type: data.eventType
          }
        });
        const MAX_NOTIFICATION_ATTEMPTS = 5;
        const attempts = existing?.attempt_count ?? 0;
        // 1. Recover previously failed notifications within retry bounds
        if (existing && existing.status === 'FAILED' && attempts < MAX_NOTIFICATION_ATTEMPTS) {
          logger.info(`[NotificationService] Retrying previously failed notification ${existing.id} (attempt ${attempts}/${MAX_NOTIFICATION_ATTEMPTS}) for order ${data.orderId}`);
          await prisma.notificationLog.update({
            where: { id: existing.id },
            data: { status: 'PENDING', error_message: null }
          });
          setImmediate(() => {
            this.processNotification(existing.id).catch((err) => {
              logger.error(err, `[NotificationService] Unhandled async error retrying notification ${existing.id}`);
            });
          });
          return;
        }

        // 2. Recover stale PROCESSING notifications whose worker lease expired (> 5 minutes old)
        if (existing && existing.status === 'PROCESSING') {
          let leaseTime = 0;
          if (existing.error_message?.startsWith('LEASE:')) {
            leaseTime = Number(existing.error_message.replace('LEASE:', ''));
          } else if (existing.created_at) {
            leaseTime = new Date(existing.created_at).getTime();
          }

          const isStale = leaseTime > 0 && (Date.now() - leaseTime > 300_000);
          if (isStale) {
            if (attempts < MAX_NOTIFICATION_ATTEMPTS) {
              logger.warn(`[NotificationService] Reclaiming stale PROCESSING notification ${existing.id} (lease expired, attempt ${attempts}/${MAX_NOTIFICATION_ATTEMPTS}) for order ${data.orderId}`);
              const reclaimed = await prisma.notificationLog.updateMany({
                where: {
                  id: existing.id,
                  status: 'PROCESSING',
                  attempt_count: existing.attempt_count
                },
                data: {
                  status: 'PENDING',
                  error_message: 'Reclaimed from expired PROCESSING worker lease'
                }
              });
              if (reclaimed.count > 0) {
                setImmediate(() => {
                  this.processNotification(existing.id).catch((err) => {
                    logger.error(err, `[NotificationService] Unhandled async error processing reclaimed notification ${existing.id}`);
                  });
                });
                return;
              }
            } else {
              logger.warn(`[NotificationService] Stale notification ${existing.id} reached retry limit (${MAX_NOTIFICATION_ATTEMPTS}). Marking FAILED.`);
              await prisma.notificationLog.update({
                where: { id: existing.id },
                data: {
                  status: 'FAILED',
                  error_message: `Exceeded maximum retry limit (${MAX_NOTIFICATION_ATTEMPTS}) after worker crash`
                }
              });
              return;
            }
          }
        }

        if (existing && (existing.status === 'FAILED' || existing.status === 'PROCESSING') && attempts >= MAX_NOTIFICATION_ATTEMPTS) {
          logger.warn(`[NotificationService] Notification ${existing.id} has reached maximum retry limit (${MAX_NOTIFICATION_ATTEMPTS}). Skipping retry.`);
          return;
        }
        logger.info(`[NotificationService] Idempotency guard: Skipping duplicate ${data.channel} notification for ${data.eventType} on order ${data.orderId} (status: ${existing?.status || 'UNKNOWN'})`);
        return;
      }
      logger.error(error, `[NotificationService] Error enqueuing notification for order ${data.orderId}`);
    }
  }

  /**
   * Reclaims notifications that were claimed by a worker that subsequently crashed
   * or timed out without writing a final SENT or FAILED status.
   *
   * Note on Delivery Guarantees:
   * External email/SMS gateways do not support two-phase commit. A crashed worker might
   * have already transmitted the message before dying. Therefore, recovering stale claims
   * guarantees AT-LEAST-ONCE delivery with bounded retries (max 5 attempts), NOT exactly-once.
   */
  async reclaimStaleProcessingNotifications(staleThresholdMs = 300_000): Promise<number> {
    try {
      const MAX_NOTIFICATION_ATTEMPTS = 5;
      const processingLogs = await prisma.notificationLog.findMany({
        where: {
          status: 'PROCESSING'
        }
      });

      let reclaimedCount = 0;
      const now = Date.now();

      for (const log of processingLogs) {
        let leaseTime = 0;
        if (log.error_message?.startsWith('LEASE:')) {
          leaseTime = Number(log.error_message.replace('LEASE:', ''));
        } else if (log.created_at) {
          leaseTime = new Date(log.created_at).getTime();
        }

        if (leaseTime > 0 && (now - leaseTime) > staleThresholdMs) {
          if (log.attempt_count >= MAX_NOTIFICATION_ATTEMPTS) {
            await prisma.notificationLog.update({
              where: { id: log.id },
              data: {
                status: 'FAILED',
                error_message: `Exceeded maximum retry limit (${MAX_NOTIFICATION_ATTEMPTS}) after worker crash`
              }
            });
            continue;
          }

          const reclaimed = await prisma.notificationLog.updateMany({
            where: {
              id: log.id,
              status: 'PROCESSING',
              attempt_count: log.attempt_count
            },
            data: {
              status: 'PENDING',
              error_message: 'Reclaimed from crashed worker lease'
            }
          });

          if (reclaimed.count > 0) {
            reclaimedCount++;
            setImmediate(() => {
              this.processNotification(log.id).catch((err) => {
                logger.error(err, `[NotificationService] Error processing reclaimed notification ${log.id}`);
              });
            });
          }
        }
      }

      if (reclaimedCount > 0) {
        logger.info(`[NotificationService] Successfully reclaimed ${reclaimedCount} stale PROCESSING notifications`);
      }
      return reclaimedCount;
    } catch (error) {
      logger.error(error, '[NotificationService] Error reclaiming stale notifications');
      return 0;
    }
  }

  private async processNotification(logId: string) {
    // 1. Atomically claim the pending notification log with a lease timestamp
    const now = Date.now();
    const claim = await prisma.notificationLog.updateMany({
      where: {
        id: logId,
        status: 'PENDING'
      },
      data: {
        status: 'PROCESSING',
        attempt_count: { increment: 1 },
        error_message: `LEASE:${now}`
      }
    });

    if (claim.count === 0) {
      // Either already claimed by another concurrent worker or already in PROCESSING/SENT state
      return;
    }

    const log = await prisma.notificationLog.findUnique({ where: { id: logId } });
    if (!log) return;

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
            sent_at: new Date(),
            error_message: null
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
