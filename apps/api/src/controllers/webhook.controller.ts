import type { Request, Response, NextFunction } from 'express';
import { razorpayService } from '../services/razorpay.service.js';
import { paymentService, OrphanedWebhookError, DuplicateWebhookError, WebhookSecurityError } from '../services/payment.service.js';
import { logger } from '../utils/logger.js';

export const webhookController = {
  /**
   * POST /api/v1/webhooks/razorpay
   *
   * Raw body middleware is required here.
   */
  async handleRazorpayWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Extract raw body and signature
      const rawBody = req.body.toString('utf8');
      const signature = req.headers['x-razorpay-signature'];

      if (!signature || typeof signature !== 'string') {
        return res.status(400).send('Missing Razorpay signature');
      }

      // 2. Cryptographically verify webhook signature
      const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        return res.status(400).send('Invalid webhook signature');
      }

      // 3. Parse JSON safely AFTER verification
      const payload = JSON.parse(rawBody);
      const eventId = req.headers['x-razorpay-event-id'] as string || payload.id;

      if (!eventId) {
        return res.status(400).send('Missing event ID');
      }

      // 4. Handle authoritative capture events
      // We explicitly ONLY use payment.captured as the final source of truth for confirmation
      // order.paid is ignored to prevent double processing and ambiguity
      if (payload.event === 'payment.captured') {
        const paymentEntity = payload.payload.payment.entity;
        const razorpayOrderId = paymentEntity.order_id;
        const razorpayPaymentId = paymentEntity.id;
        const amount = paymentEntity.amount; // in paise
        const currency = paymentEntity.currency;

        await paymentService.processPaymentSuccess(
          eventId,
          razorpayOrderId,
          razorpayPaymentId,
          amount,
          currency
        );
      } else if (payload.event === 'order.paid') {
        logger.info('[WebhookController] Safely ignoring order.paid (relying on payment.captured instead).');
      } else {
        logger.info(`[WebhookController] Unhandled Razorpay event: ${payload.event}`);
      }

      // 5. Always return 200 OK to Razorpay to acknowledge receipt
      res.status(200).send('OK');
    } catch (error) {
      if (error instanceof DuplicateWebhookError) {
        logger.info(`[WebhookController] ${error.message}. Returning 200 OK.`);
        return res.status(200).send('OK');
      }
      if (error instanceof OrphanedWebhookError) {
        logger.info(`[WebhookController] ${error.message}. Orphaned webhook safely ignored. Returning 200 OK.`);
        return res.status(200).send('OK');
      }
      if (error instanceof WebhookSecurityError) {
        logger.warn(`[WebhookController] Security exception: ${error.message}. Returning 200 OK to avoid retry loop.`);
        return res.status(200).send('Mismatch error');
      }

      logger.error(error, '[WebhookController] Error processing webhook');
      // For any other unexpected infrastructure error, return 500 to let Razorpay retry
      res.status(500).send('Internal Server Error');
    }
  },
};
