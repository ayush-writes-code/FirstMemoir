import { assertTestDatabaseSafe } from "../../utils/test-safety.js";

import { test, describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { prisma } from '@repo/database';
import { app } from '../../index.js';
import request from 'supertest';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { checkoutService } from '../../services/checkout.service.js';
import { razorpayService } from '../../services/razorpay.service.js';
import { paymentService } from '../../services/payment.service.js';
import { Prisma } from '@repo/database';

function generateSignature(payload: any) {
  return crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
}

function sendWebhook(eventId: string, payload: any) {
  if (!payload.id) {
    payload.id = eventId;
  }
  const signature = generateSignature(payload);
  return request(app)
    .post('/api/v1/webhooks/razorpay')
    .set('x-razorpay-signature', signature)
    .set('x-razorpay-event-id', eventId)
    .set('Content-Type', 'application/json')
    .send(payload);
}

describe('Phase 6D Step 3: Final Verification Tests', () => {
  let testUser: any;
  let testCart: any;
  let upload: any;
  let testProduct: any;
  let testOptionValueId: string;

  before(async () => {
    assertTestDatabaseSafe();
    // Clean up
    await prisma.webhookEvent.deleteMany({ where: { event_id: { startsWith: 'evt_final_' } } });
    await prisma.payment.deleteMany({ where: { razorpay_payment_id: { startsWith: 'pay_final_' } } });
    await prisma.orderItem.deleteMany({ where: { order: { razorpay_order_id: { startsWith: 'order_final_' } } } });
    await prisma.order.deleteMany({ where: { razorpay_order_id: { startsWith: 'order_final_' } } });
    await prisma.orderItem.deleteMany({ where: { order: { cart: { session_id: { in: ['final_test_session', 'final_fail_session', 'final_conc_wh_session'] } } } } });
    await prisma.order.deleteMany({ where: { cart: { session_id: { in: ['final_test_session', 'final_fail_session', 'final_conc_wh_session'] } } } });
    await prisma.cartLineItemOptionValue.deleteMany({ where: { cart_line_item: { cart: { session_id: { in: ['final_test_session', 'final_fail_session', 'final_conc_wh_session'] } } } } });
    await prisma.cartLineItem.deleteMany({ where: { cart: { session_id: 'final_test_session' } } });
    await prisma.cart.deleteMany({ where: { session_id: 'final_test_session' } });
    await prisma.cartLineItem.deleteMany({ where: { cart: { session_id: 'final_fail_session' } } });
    await prisma.cart.deleteMany({ where: { session_id: 'final_fail_session' } });
    await prisma.cartLineItem.deleteMany({ where: { cart: { session_id: 'final_conc_wh_session' } } });
    await prisma.cart.deleteMany({ where: { session_id: 'final_conc_wh_session' } });
    await prisma.userUpload.deleteMany({ where: { r2_key: 'final_test_key_' + Date.now() + '_' + Math.random() + '.jpg' } });
    await prisma.user.deleteMany({ where: { phone_number: '+1234567890' } });

    
    await prisma.productOptionValue.deleteMany({ where: { value: '8x10 mock' } });
    await prisma.productOption.deleteMany({ where: { name: 'Size mock' } });
    await prisma.product.deleteMany({ where: { slug: 'mock-product' } });

    testProduct = await prisma.product.create({
      data: {
        name: 'Mock Product',
        slug: 'mock-product',
        base_price: 100,
        options: {
          create: [{
            name: 'Size',
            sort_order: 1,
            is_required: true,
            input_type: 'SELECT',
            values: {
              create: [{
                value: '8x10 mock',
                sort_order: 1,
                metadata: { width: 8, height: 10, unit: 'in' },
                price_modifier: 0
              }]
            }
          }]
        }
      },
      include: {
        options: { include: { values: true } }
      }
    });
    testOptionValueId = testProduct.options[0].values[0].id;

    testUser = await prisma.user.create({
      data: {
        phone_number: '+1234567890',
        first_name: 'Final',
        last_name: 'Test',
        password_hash: 'hash',
        role: 'CUSTOMER'
      }
    });

    upload = await prisma.userUpload.create({
      data: {
        user_id: testUser.id,
        r2_key: 'final_test_key_' + Date.now() + '_' + Math.random() + '.jpg',
        original_filename: 'test.jpg',
        file_size: 1024,
        mime_type: 'image/jpeg',
        retention_status: 'CART_ATTACHED'
      }
    });

    testCart = await prisma.cart.create({
      data: {
        user_id: testUser.id,
        session_id: 'final_test_session',
        status: 'ACTIVE',
        items: {
          create: {
            upload_id: upload.id,
            product_id: testProduct.id,
            quantity: 1,
            effective_dpi: 300,
            print_quality_status: 'EXCELLENT',
            pricing_version: 1,
            crop_x: 0, crop_y: 0, crop_width: 100, crop_height: 100, crop_aspect_ratio: '1:1',
            preview_url: 'http://test.com/preview.jpg',
            orientation: 'PORTRAIT',
              selected_option_values: { create: [{ product_option_value_id: testOptionValueId }] }
          }
        }
      },
      include: { items: true }
    });
  });

  after(async () => {
    // Cleanup mocked services if we override any
  });

  describe('1. DOUBLE-RAZORPAY FIX (Concurrency)', () => {
    it('Concurrent checkout initialized twice for the same cart', async () => {
      // We monkey-patch razorpayService.createOrder to count calls and add latency
      const originalCreateOrder = razorpayService.createOrder.bind(razorpayService);
      let rzpCalls = 0;
      razorpayService.createOrder = async (amount: number, receipt: string) => {
        rzpCalls++;
        await new Promise(resolve => setTimeout(resolve, 500)); // artificial delay
        return { id: `order_final_conc_${Date.now()}_${Math.random()}` } as any;
      };

      try {
        const p1 = checkoutService.initializeCheckout('final_test_session', testUser.id, { shipping_address: { name: 'Test User', line1: '123', city: 'Test', state: 'TS', postal_code: '12345', country: 'IN' } });
        const p2 = checkoutService.initializeCheckout('final_test_session', testUser.id, { shipping_address: { name: 'Test User', line1: '123', city: 'Test', state: 'TS', postal_code: '12345', country: 'IN' } });

        const results = await Promise.allSettled([p1, p2]);
        
        // Because we bypass Express, the unique constraint violation throws a raw Prisma P2002 error
        const fulfilled = results.filter(r => r.status === 'fulfilled');
        const rejected = results.filter(r => r.status === 'rejected');
        
        assert.strictEqual(fulfilled.length, 1, 'Exactly one request should succeed');
        assert.strictEqual(rejected.length, 1, 'Exactly one request should fail due to concurrency lock');
        
        const error = (rejected[0] as PromiseRejectedResult).reason;
        // In the Express controller this is mapped to 409, but direct service calls throw Prisma errors
        console.log('ACTUAL ERROR:', error); assert.ok(error.code === 'P2002' || error.statusCode === 409, 'Rejection should be P2002 Unique Constraint Violation or 409');

        const orders = await prisma.order.findMany({ where: { cart_id: testCart.id } });
        assert.strictEqual(orders.length, 1, 'Exactly one Order should be created');
        
        // Number of razorpay create calls must be exactly 1! (Trap A fix)
        assert.strictEqual(rzpCalls, 1, 'Razorpay create-order invocation count must be exactly 1');
      } finally {
        razorpayService.createOrder = originalCreateOrder;
      }
    });
  });

  describe('2. RAZORPAY CREATION FAILURE', () => {
    it('Razorpay failure unlocks cart and uploads', async () => {
      // Re-create a fresh cart and upload
      const freshUpload = await prisma.userUpload.create({
        data: {
          user_id: testUser.id,
          r2_key: 'final_fail_key_' + Date.now() + '_' + Math.random() + '.jpg',
          original_filename: 'fail.jpg',
          file_size: 1024,
          mime_type: 'image/jpeg',
          retention_status: 'CART_ATTACHED'
        }
      });
      const failCart = await prisma.cart.create({
        data: {
          user_id: testUser.id,
          session_id: 'final_fail_session',
          status: 'ACTIVE',
          items: {
            create: { upload_id: freshUpload.id, product_id: testProduct.id, quantity: 1, effective_dpi: 300, print_quality_status: 'EXCELLENT', pricing_version: 1, crop_x: 0, crop_y: 0, crop_width: 100, crop_height: 100, crop_aspect_ratio: '1:1', preview_url: 'http://test.com/preview.jpg', orientation: 'PORTRAIT',
              selected_option_values: { create: [{ product_option_value_id: testOptionValueId }] } }
          }
        },
        include: { items: true }
      });

      const originalCreateOrder = razorpayService.createOrder.bind(razorpayService);
      razorpayService.createOrder = async () => {
        throw new Error('Razorpay API Timeout');
      };

      try {
        await assert.rejects(
          checkoutService.initializeCheckout('final_fail_session', testUser.id, { shipping_address: { name: 'Test User', line1: '123', city: 'Test', state: 'TS', postal_code: '12345', country: 'IN' } }),
          (err: any) => err.statusCode === 502
        );

        // Verify state
        const order = await prisma.order.findFirst({ where: { cart_id: failCart.id } });
        assert.strictEqual(order?.status, 'EXPIRED', 'Order should be EXPIRED');
        
        const cart = await prisma.cart.findUnique({ where: { id: failCart.id } });
        assert.strictEqual(cart?.status, 'ACTIVE', 'Cart should return to ACTIVE');
        
        const upload = await prisma.userUpload.findUnique({ where: { id: freshUpload.id } });
        assert.strictEqual(upload?.retention_status, 'CART_ATTACHED', 'Uploads should NOT remain CHECKOUT_LOCKED');
      } finally {
        razorpayService.createOrder = originalCreateOrder;
      }
    });
  });

  describe('4. WEBHOOK TRANSACTION ATOMICITY', () => {
    it('Transaction rollback on internal failure prevents partial updates', async () => {
      // First, create a valid pending order
      const order = await prisma.order.findFirst({ where: { cart_id: testCart.id } });
      assert.ok(order, 'Order must exist');
      
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_final_atomicity',
              order_id: order.razorpay_order_id,
              amount: 10000,
              currency: 'INR',
              status: 'captured'
            }
          }
        }
      };

      // We will monkey-patch prisma.userUpload.updateMany to throw an error inside the tx!
      // But we can't easily patch the tx object inside processPaymentSuccess. 
      // Instead, we will monkey patch a method that processPaymentSuccess uses.
      // Wait, processPaymentSuccess uses prisma.$transaction. We can patch userUpload.updateMany directly on the PrismaClient instance if it's the global one, but tx is a cloned object.
      // Easiest way: just mock paymentService.processPaymentSuccess to throw an error at the end of its work? No, that defeats the purpose of testing Prisma atomicity.
      // The user wants to ensure: UserUpload transition failure rolls back the Payment and WebhookEvent.
      // How to force UserUpload failure? We can temporarily delete the UserUpload or change its ID in the DB, but that might not throw an error (just 0 records updated).
      // If we want a database-level error, we can cause a constraint violation!
      // But how without altering schema? 
      // We can mock `prisma.payment.create` or `tx.userUpload.updateMany`.
      // Actually, since processPaymentSuccess receives the webhook payload, what if we just pass a string too long for a DB column? The DB will throw.
      // Let's pass a `razorpay_payment_id` that is exactly 256 characters long! (id is String, might have no limit in Postgres, but usually 255. Prisma String maps to text).
      // Another way: use a Prisma extension or interceptor?
      // For now, let's just temporarily patch `paymentService` internals if possible, or just simulate a constraint error.
      // Let's monkey-patch `prisma.$transaction`.
      
      const originalTx = prisma.$transaction.bind(prisma);
      (prisma as any).$transaction = async (arg: any) => {
         return originalTx(async (tx) => {
           await arg(tx);
           throw new Error('Artificial DB Failure after processing');
         });
      };

      try {
        const res = await sendWebhook('evt_final_atomicity', payload);
        assert.strictEqual(res.status, 500, 'Webhook should fail with 500 on unhandled DB error');
      } finally {
        (prisma as any).$transaction = originalTx;
      }

      // Check Atomicity:
      const event = await prisma.webhookEvent.findUnique({ where: { event_id: 'evt_final_atomicity' } });
      assert.strictEqual(event, null, 'WebhookEvent MUST NOT persist');

      const payment = await prisma.payment.findUnique({ where: { razorpay_payment_id: 'pay_final_atomicity' } });
      assert.strictEqual(payment, null, 'Payment MUST NOT persist');

      const checkOrder = await prisma.order.findUnique({ where: { id: order.id } });
      assert.strictEqual(checkOrder?.status, 'PENDING', 'Order MUST NOT be CONFIRMED');
      
      // Now send it again cleanly
      const res2 = await sendWebhook('evt_final_atomicity', payload);
      assert.strictEqual(res2.status, 200, 'Webhook should succeed now');
      
      const checkEvent = await prisma.webhookEvent.findUnique({ where: { event_id: 'evt_final_atomicity' } });
      assert.strictEqual(checkEvent?.processing_status, 'PROCESSED');
      const checkPayment = await prisma.payment.findUnique({ where: { razorpay_payment_id: 'pay_final_atomicity' } });
      assert.strictEqual(checkPayment?.status, 'CAPTURED');
    });
  });

  describe('5. DUPLICATE WEBHOOK CONCURRENCY', () => {
    it('Concurrent identical webhooks are idempotent and only mutate once', async () => {
      // Need a fresh pending order
      const freshUpload = await prisma.userUpload.create({
        data: {
          user_id: testUser.id,
          r2_key: 'final_conc_wh_key_' + Date.now() + '_' + Math.random() + '.jpg',
          original_filename: 'test.jpg',
          file_size: 1024,
          mime_type: 'image/jpeg',
          retention_status: 'CART_ATTACHED'
        }
      });
      const freshCart = await prisma.cart.create({
        data: {
          user_id: testUser.id,
          session_id: 'final_conc_wh_session',
          status: 'ACTIVE',
          items: {
            create: { upload_id: freshUpload.id, product_id: testProduct.id, quantity: 1, effective_dpi: 300, print_quality_status: 'EXCELLENT', pricing_version: 1, crop_x: 0, crop_y: 0, crop_width: 100, crop_height: 100, crop_aspect_ratio: '1:1', preview_url: 'http://test.com/preview.jpg', orientation: 'PORTRAIT',
              selected_option_values: { create: [{ product_option_value_id: testOptionValueId }] } }
          }
        },
        include: { items: true }
      });

      // Mock creation
      const originalCreateOrder = razorpayService.createOrder.bind(razorpayService);
      razorpayService.createOrder = async () => ({ id: `order_final_cwh_${Date.now()}` } as any);
      let order: any;
      try {
         order = await checkoutService.initializeCheckout('final_conc_wh_session', testUser.id, { shipping_address: { name: 'Test User', line1: '123', city: 'Test', state: 'TS', postal_code: '12345', country: 'IN' } });
      } finally {
        razorpayService.createOrder = originalCreateOrder;
      }

      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_final_conc_wh',
              order_id: order.razorpayOrderId,
              amount: 10000,
              currency: 'INR',
              status: 'captured'
            }
          }
        }
      };

      const p1 = sendWebhook('evt_final_conc_wh', payload);
      const p2 = sendWebhook('evt_final_conc_wh', payload);
      const p3 = sendWebhook('evt_final_conc_wh', payload);

      const [res1, res2, res3] = await Promise.all([p1, p2, p3]);
      
      // All might return 200 (one processes, others catch P2002 and return 200)
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res3.status, 200);

      const events = await prisma.webhookEvent.findMany({ where: { event_id: 'evt_final_conc_wh' } });
      assert.strictEqual(events.length, 1, 'Only 1 WebhookEvent record should exist');
      
      const payments = await prisma.payment.findMany({ where: { razorpay_payment_id: 'pay_final_conc_wh' } });
      assert.strictEqual(payments.length, 1, 'Only 1 Payment mutation should exist');
    });
  });
});
