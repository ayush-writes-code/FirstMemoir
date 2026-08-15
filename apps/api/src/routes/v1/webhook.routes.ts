import { Router } from 'express';
import { webhookController } from '../../controllers/webhook.controller.js';

export const webhookRouter = Router();

// Note: The raw body parsing middleware is applied in the root `index.ts`
// BEFORE the global `express.json()` middleware, as required for signature verification.
webhookRouter.post('/razorpay', webhookController.handleRazorpayWebhook);
