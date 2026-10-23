import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '@repo/database';
import { OrderStatus } from '@repo/database';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { notificationService } from '../services/notification/notification.service.js';

export class OrphanedWebhookError extends Error {}
export class DuplicateWebhookError extends Error {}

export const shiprocketWebhookController = {
  async handleShiprocketWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Authenticate using x-api-key
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || !env.SHIPROCKET_WEBHOOK_TOKEN || apiKey !== env.SHIPROCKET_WEBHOOK_TOKEN) {
        return res.status(401).send('Unauthorized webhook token');
      }

      // 2. Validate raw body and parse JSON safely
      if (!Buffer.isBuffer(req.body)) {
        return res.status(400).send('Expected raw buffer body');
      }
      const rawBody = req.body;
      let payload: any;
      try {
        payload = JSON.parse(rawBody.toString('utf8'));
      } catch (err) {
        return res.status(400).send('Invalid JSON payload');
      }

      // We only care about tracking updates which contain current_status_id
      if (!payload.current_status_id) {
        logger.info('[ShiprocketWebhook] Ignoring webhook without current_status_id. Returning 200 OK.');
        return res.status(200).send('OK');
      }

      const awb = payload.awb;
      const channelOrderId = payload.channel_order_id;
      const currentStatusId = Number(payload.current_status_id);

      // Logical event identity: prefer stable provider event/scan ID, fallback to composite key
      const providerEventId = payload.event_id || payload.scan_id || payload.webhook_id || payload.id;
      const shipmentIdentifier = payload.shipment_id || awb || channelOrderId;
      const scan = Array.isArray(payload.scans) && payload.scans.length > 0 ? payload.scans[0] : (payload.scan || {});
      const scanTimestamp = payload.current_timestamp || payload.status_date || scan.date || scan.time || '';
      const scanLocation = payload.location || scan.location || '';
      const scanActivity = payload.activity || scan.activity || '';
      const scanDetails = [scanTimestamp, scanLocation, scanActivity].filter(Boolean).join('_');

      const idempotencyKey = providerEventId
        ? `sr_evt_${providerEventId}`
        : (shipmentIdentifier && currentStatusId
            ? `sr_evt_${shipmentIdentifier}_${currentStatusId}${scanDetails ? `_${scanDetails}` : ''}`
            : 'sr_wh_' + crypto.createHash('sha256').update(rawBody).digest('hex'));

      // Track successful transition for post-transaction notifications
      let postTxOrderId: string | null = null;
      let postTxNextStatus: OrderStatus | null = null;

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
        let recordTransitHistory = false;

        // Terminal state regression guard: Once delivered, order cannot revert or re-transition from carrier webhooks
        if (order.status === OrderStatus.DELIVERED) {
          logger.info(`[ShiprocketWebhook] Order ${targetOrderId} is already DELIVERED; ignoring incoming carrier update with status_id ${currentStatusId}`);
        } else {
          // Group A: Advances Order state to SHIPPED
          // 42 = Picked Up, 6 = Shipped, 18 = In Transit, 17 = Out For Delivery
          const shippedStatusIds = [42, 6, 18, 17];
          
          // Group B: Advances Order state to DELIVERED
          // 7 = Delivered
          const deliveredStatusIds = [7];

          if (shippedStatusIds.includes(currentStatusId)) {
            if (order.status === 'READY_FOR_PICKUP' || order.status === 'PROCESSING') {
              nextStatus = OrderStatus.SHIPPED;
            } else if (order.status === 'SHIPPED') {
              // Order is already SHIPPED; record intermediate transit progress in history
              recordTransitHistory = true;
            }
          } else if (deliveredStatusIds.includes(currentStatusId)) {
            if (order.status === 'SHIPPED' || order.status === 'READY_FOR_PICKUP') {
              nextStatus = OrderStatus.DELIVERED;
            }
          }
        }

        // 9. Mutate state if valid transition occurred, or record interim transit history
        const effectiveScanLocation = scanLocation || (payload.scans?.[0]?.location ?? '');
        const statusDescription = `Carrier tracking update: status ${currentStatusId}${payload.current_status ? ` (${payload.current_status})` : ''}${effectiveScanLocation ? ` at ${effectiveScanLocation}` : ''}`;

        if (nextStatus) {
          await tx.order.update({
            where: { id: targetOrderId },
            data: { status: nextStatus }
          });
          await tx.orderStatusHistory.create({
            data: {
              order_id: targetOrderId,
              previous_status: order.status,
              new_status: nextStatus,
              description: statusDescription,
            }
          });
          logger.info(`[ShiprocketWebhook] Order ${targetOrderId} transitioned from ${order.status} to ${nextStatus} via status_id ${currentStatusId}`);
          
          // Mark for post-tx notification
          postTxOrderId = targetOrderId;
          postTxNextStatus = nextStatus;
        } else if (recordTransitHistory) {
          await tx.orderStatusHistory.create({
            data: {
              order_id: targetOrderId,
              previous_status: order.status,
              new_status: order.status,
              description: statusDescription,
            }
          });
          logger.info(`[ShiprocketWebhook] Recorded intermediate transit update for Order ${targetOrderId} (status_id ${currentStatusId})`);
        } else {
          logger.info(`[ShiprocketWebhook] Order ${targetOrderId} status ${order.status} unchanged by status_id ${currentStatusId}`);
        }

      }); // end transaction

      // 10. Fire async notifications post-transaction to prevent duplicate emails 
      // if the transaction were to rollback. Since the status check inside the 
      // transaction ensures we only trigger this exactly once when the state advances,
      // it is inherently idempotent.
      if (postTxOrderId && postTxNextStatus === OrderStatus.SHIPPED) {
        notificationService.dispatchOrderShipped(postTxOrderId).catch((err) => {
          logger.error(err, `Failed to dispatch order shipped notification for order ${postTxOrderId}`);
        });
      } else if (postTxOrderId && postTxNextStatus === OrderStatus.DELIVERED) {
        notificationService.dispatchOrderDelivered(postTxOrderId).catch((err) => {
          logger.error(err, `Failed to dispatch order delivered notification for order ${postTxOrderId}`);
        });
      }

      // 11. Always return 200 OK
      return res.status(200).send('OK');

    } catch (error) {
      if (error instanceof DuplicateWebhookError) {
        logger.info(`[ShiprocketWebhook] ${error.message}. Returning 200 OK.`);
        return res.status(200).send('OK');
      }
      if (error instanceof OrphanedWebhookError) {
        logger.info(`[ShiprocketWebhook] ${error.message}. Orphaned webhook safely ignored. Returning 200 OK.`);
        return res.status(200).send('OK');
      }

      logger.error(error, '[ShiprocketWebhook] Error processing webhook');
      // For unexpected infrastructure error, return 500 to let Shiprocket retry
      return res.status(500).send('Internal Server Error');
    }
  }
};
