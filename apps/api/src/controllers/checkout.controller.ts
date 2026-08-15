import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { checkoutService } from '../services/checkout.service.js';
import { successResponse } from '../utils/response.js';
import { getSessionId } from '../middlewares/session.middleware.js';
import { env } from '../config/env.js';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const addressSchema = z.object({
  name: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postal_code: z.string().min(1),
  country: z.string().min(1),
});

export const initializeCheckoutSchema = {
  body: z.object({
    customer_email: z.string().email().optional(),
    customer_phone: z.string().min(7).max(20).optional(),
    shipping_address: addressSchema,
  }),
};

// ─── Controller ───────────────────────────────────────────────────────────────

export const checkoutController = {
  /**
   * POST /api/v1/checkout/initialize
   *
   * Validates the cart, recalculates prices, creates an immutable Order/OrderItem
   * snapshot, locks asset retention, and returns the Razorpay Order ID for the
   * payment modal.
   *
   * The DB transaction commits before any Razorpay network I/O occurs.
   */
  async initializeCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = getSessionId(req);
      const userId = (req as any).user?.id;
      const input = req.body;

      const result = await checkoutService.initializeCheckout(sessionId, userId, input);

      res.status(200).json(successResponse({
        order_id: result.orderId,
        razorpay_order_id: result.razorpayOrderId,
        razorpay_key_id: env.RAZORPAY_KEY_ID,
        amount: result.amount,
        currency: result.currency,
      }));
    } catch (error) {
      next(error);
    }
  },
};
