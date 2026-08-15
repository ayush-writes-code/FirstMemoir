import { Router } from 'express';
import { checkoutController, initializeCheckoutSchema } from '../../controllers/checkout.controller.js';
import { ensureCartSession } from '../../middlewares/session.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

export const checkoutRouter = Router();

/**
 * POST /api/v1/checkout/initialize
 *
 * Initializes checkout for the current cart session.
 * - Validates cart, recalculates prices, creates immutable Order/OrderItem snapshot.
 * - Returns the Razorpay Order ID for the payment modal.
 * - Requires a cart session cookie (anonymous or authenticated).
 */
checkoutRouter.post(
  '/initialize',
  ensureCartSession,
  validate(initializeCheckoutSchema),
  checkoutController.initializeCheckout
);
