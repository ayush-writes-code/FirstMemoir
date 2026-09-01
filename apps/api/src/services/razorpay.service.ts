import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

class RazorpayService {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: env.NODE_ENV === 'test' ? 'test_key_id' : env.RAZORPAY_KEY_ID,
      key_secret: env.NODE_ENV === 'test' ? 'test_key_secret' : env.RAZORPAY_KEY_SECRET,
    });
  }

  /**
   * Creates an order in Razorpay.
   * Note: The amount must be multiplied by 100 before passing to Razorpay (e.g., paise for INR).
   * 
   * @param amount The total amount in the standard currency unit (e.g., 50.50 INR)
   * @param receipt The local order ID to use as a receipt identifier
   */
  async createOrder(amount: number, receipt: string) {
    const amountInPaise = Math.round(amount * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      // We can also pass notes if we want, but receipt is the most important
    };

    try {
      const order = await this.razorpay.orders.create(options);
      return order;
    } catch (error) {
      logger.error(error, '[RazorpayService] Order creation failed');
      throw {
        statusCode: 502,
        message: 'Failed to initialize payment gateway. Please try again.',
      };
    }
  }

  /**
   * Fetches an existing order from Razorpay to check its status.
   * 
   * @param orderId The Razorpay order ID (e.g. order_xxx)
   * @returns Razorpay order object or null if not found/error
   */
  async fetchOrder(orderId: string) {
    try {
      const order = await this.razorpay.orders.fetch(orderId);
      return order;
    } catch (error) {
      logger.error(error, `[RazorpayService] Fetch order failed for ${orderId}`);
      return null;
    }
  }

  /**
   * Cryptographically verifies the Razorpay webhook signature using HMAC SHA256.
   * 
   * @param rawBody The raw unparsed string body from the webhook request
   * @param signature The x-razorpay-signature header value
   * @returns boolean True if signature is valid
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    // Use timingSafeEqual to prevent timing attacks
    // We pad the buffers to the same length in case they differ to avoid errors
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  }
}

export const razorpayService = new RazorpayService();
