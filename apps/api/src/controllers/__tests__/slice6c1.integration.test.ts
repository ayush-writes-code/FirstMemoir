import { assertTestDatabaseSafe } from '../../utils/test-safety.js';
process.env.NODE_ENV = 'test';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../../index.js';
import { prisma, Prisma } from '@repo/database';
import { env } from '../../config/env.js';
import { r2Provider, validateAndGetBucket } from '../../services/storage/r2.provider.js';
import { razorpayService } from '../../services/razorpay.service.js';
import { checkoutService } from '../../services/checkout.service.js';
import { paymentService } from '../../services/payment.service.js';

const originalCreateOrder = razorpayService.createOrder;
const originalFetchOrder = razorpayService.fetchOrder;

const validShipping = {
  name: 'Test Customer',
  line1: '123 Staging Lane',
  city: 'Bengaluru',
  state: 'Karnataka',
  postal_code: '560001',
  country: 'IN',
};

function generateWebhookSignature(payload: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

describe('Slice 6C.1 - Security & Idempotency Hardening Verification', () => {
  before(async () => {
    assertTestDatabaseSafe();
  });

  after(async () => {
    razorpayService.createOrder = originalCreateOrder;
    razorpayService.fetchOrder = originalFetchOrder;
  });

  // =========================================================================
  // 1. R2 ACCESS MODEL & PROVIDER HARDENING
  // =========================================================================
  describe('1. R2 Access Model & Routing Guards', () => {
    it('1.1: products/* routes strictly to public bucket', () => {
      const result = validateAndGetBucket('products/sample-art.webp');
      assert.strictEqual(result.bucket, env.R2_PUBLIC_BUCKET_NAME);
      assert.strictEqual(result.visibility, 'public');
    });

    it('1.2: previews/* routes strictly to private bucket', () => {
      const result = validateAndGetBucket('previews/thumb-123.webp');
      assert.strictEqual(result.bucket, env.R2_PRIVATE_BUCKET_NAME);
      assert.strictEqual(result.visibility, 'private');
    });

    it('1.3: customers/* routes strictly to private bucket', () => {
      const result = validateAndGetBucket('customers/1720000000-uuid.jpg');
      assert.strictEqual(result.bucket, env.R2_PRIVATE_BUCKET_NAME);
      assert.strictEqual(result.visibility, 'private');
    });

    it('1.4: customers/* and previews/* cannot be converted into a public URL (fail-closed guard)', () => {
      assert.throws(
        () => r2Provider.getPublicUrl('customers/private-master.jpg'),
        /Cannot generate public URL for private object/
      );
      assert.throws(
        () => r2Provider.getPublicUrl('previews/thumb-123.webp'),
        /Cannot generate public URL for private object/
      );
    });

    it('1.5: products/* generate valid public URLs', () => {
      const productUrl = r2Provider.getPublicUrl('products/frame.webp');
      assert.ok(productUrl.includes('/products/frame.webp'));
    });

    it('1.6: invalid/unknown prefix fails closed across all storage methods', () => {
      assert.throws(
        () => validateAndGetBucket('malicious/payload.sh'),
        /Invalid or unauthorized storage key prefix/
      );
      assert.throws(
        () => r2Provider.getPublicUrl('malicious/payload.sh'),
        /Invalid or unauthorized storage key prefix/
      );
    });

    it('1.7: private customer object generates signed read URL', async () => {
      const signedUrl = await r2Provider.generateReadUrl('customers/test-signed.jpg');
      assert.ok(typeof signedUrl === 'string');
      assert.ok(signedUrl.includes('https://'));
    });
  });

  // =========================================================================
  // 2. UPLOAD SESSION SECURITY & AUTHORIZATION
  // =========================================================================
  describe('2. Upload Session Security & Ownership Isolation', () => {
    let sessionA: any;
    let sessionB: any;
    let uploadKeyA: string;

    before(async () => {
      sessionA = request.agent(app);
      sessionB = request.agent(app);
    });

    it('2.1: Anonymous Session A can create an upload bound to its session (guest checkout supported)', async () => {
      const res = await sessionA
        .post('/api/v1/storage/upload-url')
        .send({ file_name: 'photo-a.jpg', mime_type: 'image/jpeg', visibility: 'private' });

      assert.strictEqual(res.status, 201);
      assert.ok(res.body.data.upload_url);
      assert.ok(res.body.data.file_key.startsWith('customers/'));
      assert.strictEqual(res.body.data.public_url, null, 'Private customer upload MUST NOT return a public URL');

      uploadKeyA = res.body.data.file_key;
      const uploadRecord = await prisma.userUpload.findUnique({ where: { r2_key: uploadKeyA } });
      assert.ok(uploadRecord);
      assert.strictEqual(uploadRecord.status, 'UPLOADING');
    });

    it('2.2: Session B cannot complete Session A upload (ownership check rejects with 403)', async () => {
      const res = await sessionB
        .post('/api/v1/storage/upload-complete')
        .send({ file_key: uploadKeyA, original_filename: 'photo-a.jpg' });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error, 'Unauthorized to claim this upload');
    });

    it('2.3: Session B cannot retrieve Session A private upload read URL (rejects with 403)', async () => {
      const res = await sessionB
        .get(`/api/v1/storage/read-url?file_key=${encodeURIComponent(uploadKeyA)}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error, 'Unauthorized to access this upload');
    });

    it('2.4: Session A can retrieve its own private upload read URL (200 with signed URL)', async () => {
      const res = await sessionA
        .get(`/api/v1/storage/read-url?file_key=${encodeURIComponent(uploadKeyA)}`);

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.signed_url);
      assert.strictEqual(res.body.data.file_key, uploadKeyA);
    });

    it('2.5: Non-existent upload returns 404', async () => {
      const res = await sessionA
        .get('/api/v1/storage/read-url?file_key=customers/non-existent-upload.jpg');

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error, 'Upload not found');
    });
  });

  // =========================================================================
  // 3. RAZORPAY WEBHOOK IDEMPOTENCY & RETRY BEHAVIOR
  // =========================================================================
  describe('3. Razorpay Webhook Idempotency & Retry Evidence', () => {
    let testOrder: any;
    let testUpload: any;
    let whCart: any;
    const testRzpOrderId = `order_rzp_webhook_${Date.now()}`;
    const testAmountRupees = 299;
    const testAmountPaise = testAmountRupees * 100;

    beforeEach(async () => {
      await prisma.webhookEvent.deleteMany();
      await prisma.payment.deleteMany();
      await prisma.orderStatusHistory.deleteMany();
      await prisma.orderItem.deleteMany();
      await prisma.order.deleteMany();
      await prisma.cartLineItem.deleteMany();
      await prisma.cart.deleteMany();
      await prisma.userUpload.deleteMany();

      testUpload = await prisma.userUpload.create({
        data: {
          session_id: 'wh-session-1',
          original_filename: 'master.jpg',
          r2_key: `customers/wh-${Date.now()}.jpg`,
          preview_r2_key: `previews/wh-${Date.now()}.webp`,
          mime_type: 'image/jpeg',
          file_size: 204800,
          width: 1200,
          height: 1800,
          status: 'READY',
          retention_status: 'CHECKOUT_LOCKED',
        }
      });

      whCart = await prisma.cart.create({
        data: {
          session_id: 'wh-session-1',
          status: 'CHECKOUT_STARTED',
        }
      });

      testOrder = await prisma.order.create({
        data: {
          cart_id: whCart.id,
          session_id: 'wh-session-1',
          status: 'PENDING',
          razorpay_order_id: testRzpOrderId,
          total_amount: new Prisma.Decimal(testAmountRupees),
          subtotal_amount: new Prisma.Decimal(testAmountRupees),
          shipping_fee: new Prisma.Decimal(0),
          tax_amount: new Prisma.Decimal(0),
          discount_amount: new Prisma.Decimal(0),
          customer_email: 'buyer@test.com',
          customer_phone: '+919876543210',
          shipping_address_snapshot: validShipping as any,
          items: {
            create: [
              {
                product_id: (await prisma.product.findFirst())?.id || 'sample-prod',
                upload_id: testUpload.id,
                quantity: 1,
                unit_price: new Prisma.Decimal(testAmountRupees),
                customization_data: { product_type: 'STANDARD', master_file_key: null }
              }
            ]
          }
        }
      });
    });

    it('3.1: Invalid HMAC signature is rejected with 400', async () => {
      const payload = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_invalid_sig',
              order_id: testRzpOrderId,
              amount: testAmountPaise,
              currency: 'INR',
            }
          }
        }
      });

      const res = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', 'wrong_signature')
        .set('x-razorpay-event-id', 'evt_invalid_1')
        .send(payload);

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.text, 'Invalid webhook signature');
    });

    it('3.2: First valid webhook processes atomically (Payment CAPTURED, Order CONFIRMED, WebhookEvent PROCESSED)', async () => {
      const eventId = `evt_first_${Date.now()}`;
      const paymentId = `pay_${Date.now()}`;
      const payloadObj = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: testRzpOrderId,
              amount: testAmountPaise,
              currency: 'INR',
            }
          }
        }
      };
      const rawBody = JSON.stringify(payloadObj);
      const signature = generateWebhookSignature(rawBody, env.RAZORPAY_WEBHOOK_SECRET);

      const res = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', eventId)
        .send(rawBody);

      assert.strictEqual(res.status, 200);

      // Verify DB assertions
      const updatedOrder = await prisma.order.findUnique({ where: { id: testOrder.id } });
      assert.strictEqual(updatedOrder?.status, 'CONFIRMED');

      const payment = await prisma.payment.findFirst({ where: { order_id: testOrder.id } });
      assert.ok(payment);
      assert.strictEqual(payment.status, 'CAPTURED');
      assert.strictEqual(payment.razorpay_payment_id, paymentId);

      const webhookEvent = await prisma.webhookEvent.findUnique({ where: { event_id: eventId } });
      assert.ok(webhookEvent);
      assert.strictEqual(webhookEvent.processing_status, 'PROCESSED');

      const updatedUpload = await prisma.userUpload.findUnique({ where: { id: testUpload.id } });
      assert.strictEqual(updatedUpload?.retention_status, 'ORDERED_RETAINED');
    });

    it('3.3: Duplicate valid webhook returns 200 idempotently with no double-processing', async () => {
      const eventId = `evt_dup_${Date.now()}`;
      const paymentId = `pay_dup_${Date.now()}`;
      const rawBody = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: testRzpOrderId,
              amount: testAmountPaise,
              currency: 'INR',
            }
          }
        }
      });
      const signature = generateWebhookSignature(rawBody, env.RAZORPAY_WEBHOOK_SECRET);

      // First call
      const res1 = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', eventId)
        .send(rawBody);
      assert.strictEqual(res1.status, 200);

      // Duplicate call
      const res2 = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', eventId)
        .send(rawBody);
      assert.strictEqual(res2.status, 200);

      // Invariants: Single Payment, Single WebhookEvent
      const paymentCount = await prisma.payment.count({ where: { order_id: testOrder.id } });
      assert.strictEqual(paymentCount, 1);

      const eventCount = await prisma.webhookEvent.count({ where: { event_id: eventId } });
      assert.strictEqual(eventCount, 1);
    });

    it('3.4: Processing failure rolls back transaction completely, allowing retry', async () => {
      const eventId = `evt_retryable_${Date.now()}`;
      const paymentId = `pay_retryable_${Date.now()}`;

      // Simulate an unretryable pre-check or transaction abort (e.g. currency mismatch)
      try {
        await paymentService.processPaymentSuccess(
          eventId,
          testRzpOrderId,
          paymentId,
          testAmountPaise,
          'EUR' // Unsupported currency
        );
        assert.fail('Expected WebhookSecurityError');
      } catch (err: any) {
        assert.ok(err.message.includes('Unsupported currency'));
      }

      // Assert WebhookEvent is NOT committed because error occurred before/rolled back
      const eventBeforeRetry = await prisma.webhookEvent.findUnique({ where: { event_id: eventId } });
      assert.strictEqual(eventBeforeRetry, null, 'WebhookEvent must be absent when processing aborts');

      // Now retry with valid INR currency
      await paymentService.processPaymentSuccess(
        eventId,
        testRzpOrderId,
        paymentId,
        testAmountPaise,
        'INR'
      );

      // Final successful retry assertions
      const eventAfterRetry = await prisma.webhookEvent.findUnique({ where: { event_id: eventId } });
      assert.ok(eventAfterRetry);
      assert.strictEqual(eventAfterRetry.processing_status, 'PROCESSED');

      const confirmedOrder = await prisma.order.findUnique({ where: { id: testOrder.id } });
      assert.strictEqual(confirmedOrder?.status, 'CONFIRMED');
    });
  });

  // =========================================================================
  // 4. CHECKOUT INITIALIZATION IDEMPOTENCY & PRICE AUTHORITY
  // =========================================================================
  describe('4. Checkout Initialization Idempotency & Price Authority', () => {
    let testCart: any;
    let standardProduct: any;
    const testSessionId = `checkout-idempotency-${Date.now()}`;

    before(async () => {
      standardProduct = await prisma.product.findFirst({
        where: { sku: 'FM-FRM-FFC-CAMARO' },
      });
      assert.ok(standardProduct, 'Expected FM-FRM-FFC-CAMARO in test database');

      testCart = await prisma.cart.create({
        data: {
          session_id: testSessionId,
          status: 'ACTIVE',
        }
      });

      await prisma.cartLineItem.create({
        data: {
          cart_id: testCart.id,
          product_id: standardProduct.id,
          quantity: 1,
          pricing_version: 1,
        }
      });
    });

    it('Case A: First initialize creates local PENDING order and Razorpay order', async () => {
      let createdRzpOrder = false;
      razorpayService.createOrder = async (amount: number, receipt: string) => {
        createdRzpOrder = true;
        return {
          id: `rzp_ord_${Date.now()}`,
          entity: 'order',
          amount: Math.round(amount * 100),
          currency: 'INR',
          status: 'created',
          attempts: 0,
        } as any;
      };

      const result = await checkoutService.initializeCheckout(testSessionId, undefined, {
        customer_email: 'buyer@test.com',
        customer_phone: '+919876543210',
        shipping_address: validShipping,
      });

      assert.ok(result.orderId);
      assert.ok(result.razorpayOrderId);
      assert.strictEqual(result.amount, Number(standardProduct.base_price) * 100);
      assert.strictEqual(createdRzpOrder, true);

      const dbOrder = await prisma.order.findUnique({ where: { id: result.orderId } });
      assert.strictEqual(dbOrder?.status, 'PENDING');
    });

    it('Case B: Second initialize with identical cart reuses existing PENDING order & Razorpay order', async () => {
      const existingOrder = await prisma.order.findFirst({
        where: { cart_id: testCart.id, status: 'PENDING' }
      });
      assert.ok(existingOrder);

      let createdNewRzpOrder = false;
      razorpayService.createOrder = async () => {
        createdNewRzpOrder = true;
        return {} as any;
      };

      razorpayService.fetchOrder = async (orderId: string) => {
        return {
          id: orderId,
          entity: 'order',
          status: 'created',
          attempts: 0,
        } as any;
      };

      const result = await checkoutService.initializeCheckout(testSessionId, undefined, {
        customer_email: 'buyer@test.com',
        customer_phone: '+919876543210',
        shipping_address: validShipping,
      });

      assert.strictEqual(result.orderId, existingOrder.id, 'Must reuse identical local order');
      assert.strictEqual(result.razorpayOrderId, existingOrder.razorpay_order_id, 'Must reuse identical Razorpay order');
      assert.strictEqual(createdNewRzpOrder, false, 'Must NOT create duplicate Razorpay order');
    });

    it('Case C: If existing Razorpay order is expired/attempted, deterministically replaces with new order', async () => {
      const existingOrder = await prisma.order.findFirst({
        where: { cart_id: testCart.id, status: 'PENDING' }
      });
      assert.ok(existingOrder);

      // Simulate attempted Razorpay order
      razorpayService.fetchOrder = async (orderId: string) => {
        return {
          id: orderId,
          entity: 'order',
          status: 'created',
          attempts: 1, // Already attempted
        } as any;
      };

      let newRzpId = `rzp_replacement_${Date.now()}`;
      razorpayService.createOrder = async (amount: number, receipt: string) => {
        return {
          id: newRzpId,
          entity: 'order',
          amount: Math.round(amount * 100),
          status: 'created',
          attempts: 0,
        } as any;
      };

      const result = await checkoutService.initializeCheckout(testSessionId, undefined, {
        customer_email: 'buyer@test.com',
        customer_phone: '+919876543210',
        shipping_address: validShipping,
      });

      assert.notStrictEqual(result.orderId, existingOrder.id);
      assert.strictEqual(result.razorpayOrderId, newRzpId);

      const oldOrder = await prisma.order.findUnique({ where: { id: existingOrder.id } });
      assert.strictEqual(oldOrder?.status, 'EXPIRED', 'Old local order must be EXPIRED');
    });

    it('Case D: If existing Razorpay order is already paid, rejects with 409 conflict', async () => {
      // Simulate paid Razorpay order
      razorpayService.fetchOrder = async (orderId: string) => {
        return {
          id: orderId,
          entity: 'order',
          status: 'paid',
        } as any;
      };

      await assert.rejects(
        async () => {
          await checkoutService.initializeCheckout(testSessionId, undefined, {
            customer_email: 'buyer@test.com',
            customer_phone: '+919876543210',
            shipping_address: validShipping,
          });
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 409);
          assert.ok(err.message.includes('Payment already received'));
          return true;
        }
      );
    });

    it('Case E: Authoritative backend pricing cannot be tampered with by client payload', async () => {
      // Reset fetchOrder so it allows reuse
      razorpayService.fetchOrder = async (orderId: string) => {
        return {
          id: orderId,
          entity: 'order',
          status: 'created',
          attempts: 0,
        } as any;
      };

      razorpayService.createOrder = async (amount: number, receipt: string) => {
        return {
          id: `rzp_case_e_${Date.now()}`,
          entity: 'order',
          amount: Math.round(amount * 100),
          status: 'created',
          attempts: 0,
        } as any;
      };

      const freshSessionId = `checkout-case-e-${Date.now()}`;
      const freshCart = await prisma.cart.create({
        data: {
          session_id: freshSessionId,
          status: 'ACTIVE',
        }
      });
      await prisma.cartLineItem.create({
        data: {
          cart_id: freshCart.id,
          product_id: standardProduct.id,
          quantity: 1,
          pricing_version: 1,
        }
      });

      const result = await checkoutService.initializeCheckout(freshSessionId, undefined, {
        customer_email: 'buyer@test.com',
        customer_phone: '+919876543210',
        shipping_address: validShipping,
      });

      assert.strictEqual(result.amount, Number(standardProduct.base_price) * 100);
    });
  });

  // =========================================================================
  // 5. UPLOAD STATE RECOVERY & CONFIRMED ORDER PROTECTION
  // =========================================================================
  describe('5. Upload State Recovery & Confirmed Order Invariant', () => {
    let recoverySessionId: string;
    let recoveryCart: any;
    let recoveryUpload: any;
    let customProduct: any;
    let sizeValue: any;

    before(async () => {
      // Find or create a product with a Size option so personalized uploads resolve physical dimensions
      customProduct = await prisma.product.findFirst({
        where: { sku: 'TEST-CST-POS-01' },
        include: { options: { include: { values: true } } }
      });

      if (!customProduct) {
        customProduct = await prisma.product.create({
          data: {
            name: 'Test Custom Print Fixture',
            slug: `test-custom-print-${Date.now()}`,
            sku: 'TEST-CST-POS-01',
            base_price: '500.00',
            is_active: true,
            categories: {
              create: {
                category: {
                  connect: { slug: 'custom-prints' }
                }
              }
            },
            options: {
              create: {
                name: 'Size',
                input_type: 'SELECT',
                is_required: true,
                sort_order: 0,
                values: {
                  create: {
                    value: '8x10',
                    modifier_type: 'FLAT',
                    price_modifier: '0.00',
                    metadata: { width: 8, height: 10, unit: 'in' },
                    is_active: true,
                    sort_order: 0,
                  }
                }
              }
            }
          },
          include: { options: { include: { values: true } } }
        });
      }

      sizeValue = customProduct.options.find((o: any) => o.name === 'Size')?.values[0];
      assert.ok(sizeValue, 'Expected size value for personalized test');
    });

    beforeEach(async () => {
      recoverySessionId = `upload-rec-${Date.now()}`;

      recoveryUpload = await prisma.userUpload.create({
        data: {
          session_id: recoverySessionId,
          original_filename: 'recovery.jpg',
          r2_key: `customers/rec-${Date.now()}.jpg`,
          preview_r2_key: `previews/rec-${Date.now()}.webp`,
          mime_type: 'image/jpeg',
          file_size: 102400,
          width: 800,
          height: 1200,
          status: 'READY',
          retention_status: 'CART_ATTACHED',
        }
      });

      recoveryCart = await prisma.cart.create({
        data: {
          session_id: recoverySessionId,
          status: 'ACTIVE',
        }
      });

      await prisma.cartLineItem.create({
        data: {
          cart_id: recoveryCart.id,
          product_id: customProduct.id,
          upload_id: recoveryUpload.id,
          quantity: 1,
          pricing_version: 1,
          selected_option_values: {
            create: {
              product_option_value_id: sizeValue.id,
            }
          }
        }
      });
    });

    it('5.1: Razorpay gateway failure safely rolls back upload to CART_ATTACHED and cart to ACTIVE', async () => {
      // Simulate Razorpay network failure
      razorpayService.createOrder = async () => {
        throw new Error('Connection refused to Razorpay API');
      };

      await assert.rejects(
        async () => {
          await checkoutService.initializeCheckout(recoverySessionId, undefined, {
            customer_email: 'buyer@test.com',
            customer_phone: '+919876543210',
            shipping_address: validShipping,
          });
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 502);
          assert.ok(err.message.includes('Payment gateway unavailable'));
          return true;
        }
      );

      // Verify recovery state
      const cartAfterFailure = await prisma.cart.findUnique({ where: { id: recoveryCart.id } });
      assert.strictEqual(cartAfterFailure?.status, 'ACTIVE');

      const uploadAfterFailure = await prisma.userUpload.findUnique({ where: { id: recoveryUpload.id } });
      assert.strictEqual(uploadAfterFailure?.retention_status, 'CART_ATTACHED');

      const expiredOrder = await prisma.order.findFirst({
        where: { cart_id: recoveryCart.id, status: 'EXPIRED' }
      });
      assert.ok(expiredOrder, 'Failed order must be marked EXPIRED');
    });

    it('5.2: Checkout retry succeeds and re-locks upload to CHECKOUT_LOCKED', async () => {
      // Restore working Razorpay service
      razorpayService.createOrder = async (amount: number, receipt: string) => {
        return {
          id: `rzp_rec_success_${Date.now()}`,
          entity: 'order',
          amount: Math.round(amount * 100),
          status: 'created',
          attempts: 0,
        } as any;
      };

      const result = await checkoutService.initializeCheckout(recoverySessionId, undefined, {
        customer_email: 'buyer@test.com',
        customer_phone: '+919876543210',
        shipping_address: validShipping,
      });

      assert.ok(result.orderId);

      const uploadAfterRetry = await prisma.userUpload.findUnique({ where: { id: recoveryUpload.id } });
      assert.strictEqual(uploadAfterRetry?.retention_status, 'CHECKOUT_LOCKED');
    });

    it('5.3: Genuinely confirmed order uploads are NEVER unlocked by subsequent checkout failures', async () => {
      const confirmedUpload = await prisma.userUpload.create({
        data: {
          session_id: 'confirmed-session',
          original_filename: 'confirmed.jpg',
          r2_key: `customers/confirmed-${Date.now()}.jpg`,
          preview_r2_key: `previews/confirmed-${Date.now()}.webp`,
          mime_type: 'image/jpeg',
          file_size: 102400,
          width: 800,
          height: 1200,
          status: 'READY',
          retention_status: 'ORDERED_RETAINED',
        }
      });

      const confirmedCart = await prisma.cart.create({
        data: {
          session_id: 'confirmed-session',
          status: 'CHECKOUT_STARTED',
        }
      });

      const confirmedOrder = await prisma.order.create({
        data: {
          cart_id: confirmedCart.id,
          session_id: 'confirmed-session',
          status: 'CONFIRMED',
          total_amount: new Prisma.Decimal(299),
          subtotal_amount: new Prisma.Decimal(299),
          shipping_fee: new Prisma.Decimal(0),
          tax_amount: new Prisma.Decimal(0),
          discount_amount: new Prisma.Decimal(0),
          customer_email: 'confirmed@test.com',
          customer_phone: '+919876543210',
          shipping_address_snapshot: validShipping as any,
          items: {
            create: [
              {
                product_id: customProduct.id,
                upload_id: confirmedUpload.id,
                quantity: 1,
                unit_price: new Prisma.Decimal(299),
                customization_data: { product_type: 'PERSONALIZED', master_file_key: 'customers/confirmed.jpg' }
              }
            ]
          }
        }
      });

      // Trigger a failure on an unrelated checkout
      razorpayService.createOrder = async () => {
        throw new Error('Unrelated failure');
      };

      try {
        await checkoutService.initializeCheckout(recoverySessionId, undefined, {
          customer_email: 'buyer@test.com',
          customer_phone: '+919876543210',
          shipping_address: validShipping,
        });
      } catch {
        // Expected failure
      }

      // Assert confirmed upload is completely untouched
      const checkConfirmedUpload = await prisma.userUpload.findUnique({ where: { id: confirmedUpload.id } });
      assert.strictEqual(checkConfirmedUpload?.retention_status, 'ORDERED_RETAINED');

      const checkConfirmedOrder = await prisma.order.findUnique({ where: { id: confirmedOrder.id } });
      assert.strictEqual(checkConfirmedOrder?.status, 'CONFIRMED');
    });
  });
});
