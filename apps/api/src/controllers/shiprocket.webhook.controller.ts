import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '@repo/database';
import { OrderStatus } from '@repo/database';
import { env } from '../config/env.js';

export class OrphanedWebhookError extends Error {}
export class DuplicateWebhookError extends Error {}

export const shiprocketWebhookController = {
  async handleShiprocketWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Authenticate using x-api-key
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== env.SHIPROCKET_WEBHOOK_TOKEN) {
        return res.status(401).send('Unauthorized webhook token');
      }

      // 2. Validate raw body and generate deterministic idempotency fingerprint
      if (!Buffer.isBuffer(req.body)) {
        return res.status(400).send('Expected raw buffer body');
      }
      const rawBody = req.body;
      const idempotencyKey = 'sr_wh_' + crypto.createHash('sha256').update(rawBody).digest('hex');

      // 3. Parse JSON safely
      let payload: any;
      try {
        payload = JSON.parse(rawBody.toString('utf8'));
      } catch (err) {
        return res.status(400).send('Invalid JSON payload');
      }

      // We only care about tracking updates which contain current_status_id
      if (!payload.current_status_id) {
        console.log('[ShiprocketWebhook] Ignoring webhook without current_status_id. Returning 200 OK.');
        return res.status(200).send('OK');
      }

      const awb = payload.awb;
      const channelOrderId = payload.channel_order_id;
      const currentStatusId = Number(payload.current_status_id);

      // We handle everything inside a robust transaction
      await prisma.$transaction(async (tx: any) => {
        // 4. Resolve Order deterministically
        let targetOrderId: string | null = null;

        if (awb) {
          const orderByAwb = await tx.order.findFirst({
            where: { tracking_awb: String(awb) },
            select: { id: true }
          });
          if (orderByAwb) targetOrderId = orderByAwb.id;
        }

        if (!targetOrderId && channelOrderId) {
          const orderByChannel = await tx.order.findUnique({
            where: { id: String(channelOrderId) },
            select: { id: true }
          });
          if (orderByChannel) targetOrderId = orderByChannel.id;
        }

        if (!targetOrderId) {
          throw new OrphanedWebhookError(`Order not found for AWB: ${awb} or Channel ID: ${channelOrderId}`);
        }

        // 5. Lock the Order row
        await tx.$executeRaw`SELECT 1 FROM orders WHERE id = ${targetOrderId} FOR UPDATE`;

        // 6. Check idempotency and record the webhook event
        try {
          await tx.webhookEvent.create({
            data: {
              provider: 'shiprocket',
              event_id: idempotencyKey,
              event_type: 'awb_status',
              payload: payload,
              processing_status: 'PROCESSED',
              processed_at: new Date()
            }
          });
        } catch (error: any) {
          if (error.code === 'P2002') {
            throw new DuplicateWebhookError(`Duplicate event_id: ${idempotencyKey}`);
          }
          throw error;
        }

        // 7. Re-check current Order status within lock
        const order = await tx.order.findUnique({
          where: { id: targetOrderId },
          select: { id: true, status: true }
        });

        if (!order) {
           throw new OrphanedWebhookError(`Order vanished: ${targetOrderId}`);
        }

        // 8. Apply only valid forward transitions
        let nextStatus: OrderStatus | null = null;

        // Group A: Advances Order state to SHIPPED
        // 42 = Picked Up, 6 = Shipped, 18 = In Transit, 17 = Out For Delivery
        const shippedStatusIds = [42, 6, 18, 17];
        
        // Group B: Advances Order state to DELIVERED
        // 7 = Delivered
        const deliveredStatusIds = [7];

        if (shippedStatusIds.includes(currentStatusId)) {
          if (order.status === 'READY_FOR_PICKUP') {
            nextStatus = OrderStatus.SHIPPED;
          }
        } else if (deliveredStatusIds.includes(currentStatusId)) {
          if (order.status === 'SHIPPED') {
            nextStatus = OrderStatus.DELIVERED;
          }
        }

        // 9. Mutate state if valid transition occurred
        if (nextStatus) {
          await tx.order.update({
            where: { id: targetOrderId },
            data: { status: nextStatus }
          });
          console.log(`[ShiprocketWebhook] Order ${targetOrderId} transitioned from ${order.status} to ${nextStatus} via status_id ${currentStatusId}`);
        } else {
          console.log(`[ShiprocketWebhook] Order ${targetOrderId} status ${order.status} unchanged by status_id ${currentStatusId}`);
        }

      }); // end transaction

      // 10. Always return 200 OK
      return res.status(200).send('OK');

    } catch (error) {
      if (error instanceof DuplicateWebhookError) {
        console.log(`[ShiprocketWebhook] ${error.message}. Returning 200 OK.`);
        return res.status(200).send('OK');
      }
      if (error instanceof OrphanedWebhookError) {
        console.log(`[ShiprocketWebhook] ${error.message}. Orphaned webhook safely ignored. Returning 200 OK.`);
        return res.status(200).send('OK');
      }

      console.error('[ShiprocketWebhook] Error processing webhook:', error);
      // For unexpected infrastructure error, return 500 to let Shiprocket retry
      return res.status(500).send('Internal Server Error');
    }
  }
};
