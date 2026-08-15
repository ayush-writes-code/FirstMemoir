import { prisma } from '@repo/database';

export class OrphanedWebhookError extends Error {}
export class DuplicateWebhookError extends Error {}
export class WebhookSecurityError extends Error {}

export const paymentService = {
  /**
   * Processes an authoritative payment success webhook from Razorpay.
   * Atomic transaction handles idempotency, payment creation, order confirmation,
   * and upload retention locking.
   */
  async processPaymentSuccess(
    eventId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    amount: number,
    currency: string
  ) {
    if (currency !== 'INR') {
      throw new WebhookSecurityError(`Unsupported currency: ${currency}`);
    }

    try {
      const txResult = await prisma.$transaction(async (tx) => {
        // 1. Insert WebhookEvent with unique event_id (idempotency)
        let webhookEvent;
        try {
          webhookEvent = await tx.webhookEvent.create({
            data: {
              event_id: eventId,
              event_type: 'payment.captured',
              payload: {}, 
              processing_status: 'PROCESSING',
            },
          });
        } catch (error: any) {
          if (error.code === 'P2002') {
            throw new DuplicateWebhookError(`Duplicate event_id: ${eventId}`);
          }
          throw error;
        }

        // 3. Lock the Order row using SELECT FOR UPDATE
        const orders = await tx.$queryRaw<any[]>`
          SELECT * FROM "orders" 
          WHERE "razorpay_order_id" = ${razorpayOrderId} 
          FOR UPDATE
        `;

        const order = orders[0];

        // 4. Verify Order exists
        if (!order) {
          await tx.webhookEvent.update({
            where: { id: webhookEvent.id },
            data: { processing_status: 'ORPHANED', processed_at: new Date() },
          });
          return { status: 'ORPHANED', error: new OrphanedWebhookError(`Order not found for Razorpay Order ID: ${razorpayOrderId}`) };
        }

        // 5. Verify current Order status
        if (order.status !== 'PENDING') {
          await tx.webhookEvent.update({
            where: { id: webhookEvent.id },
            data: { processing_status: 'RECONCILIATION_REQUIRED', processed_at: new Date() },
          });
          return { status: 'RECONCILIATION_REQUIRED', message: `Order ${order.id} is not PENDING (Status: ${order.status})` };
        }

        // 6. Verify amount
        const expectedAmountPaise = Math.round(Number(order.total_amount) * 100);
        if (amount !== expectedAmountPaise) {
          await tx.webhookEvent.update({
            where: { id: webhookEvent.id },
            data: { processing_status: 'SECURITY_ERROR', processed_at: new Date() },
          });
          return { status: 'SECURITY_ERROR', error: new WebhookSecurityError(`Amount mismatch. Expected: ${expectedAmountPaise}, Received: ${amount}`) };
        }

        // 7. Update Payment
        await tx.payment.create({
          data: {
            order_id: order.id,
            razorpay_payment_id: razorpayPaymentId,
            amount: order.total_amount,
            status: 'CAPTURED',
            method: 'razorpay',
          }
        });

        // 8. Update Order
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'CONFIRMED' },
        });

        // 9. Update UserUpload retention
        const orderItems = await tx.orderItem.findMany({
          where: { order_id: order.id },
          select: { upload_id: true },
        });

        const uploadIds = orderItems.map((oi: any) => oi.upload_id).filter(Boolean) as string[];

        if (uploadIds.length > 0) {
          const updateResult = await tx.userUpload.updateMany({
            where: {
              id: { in: uploadIds },
              retention_status: 'CHECKOUT_LOCKED',
            },
            data: { retention_status: 'ORDERED_RETAINED' },
          });

          if (updateResult.count !== uploadIds.length) {
            throw new Error('Failed to update all UserUploads to ORDERED_RETAINED. Rolling back transaction.');
          }
        }

        // 10. Mark WebhookEvent processed
        await tx.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: { processing_status: 'PROCESSED', processed_at: new Date() },
        });

        return { status: 'SUCCESS' };
      }, { timeout: 15000, maxWait: 5000 });
      
      if (txResult.status === 'ORPHANED') {
        throw txResult.error;
      }
      
      if (txResult.status === 'SECURITY_ERROR') {
        throw txResult.error;
      }
      
      if (txResult.status === 'RECONCILIATION_REQUIRED') {
        console.log(`[PaymentService] ${txResult.message}. Returning 200 for reconciliation.`);
        return; // Success without throwing, so caller returns 200
      }
      
    } catch (error) {
      throw error;
    }
  }
};
