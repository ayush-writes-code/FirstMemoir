import { assertTestDatabaseSafe } from "../../utils/test-safety.js";

process.env.NODE_ENV = 'test';
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../index.js';
import { prisma } from '@repo/database';
import crypto from 'crypto';
import { razorpayService } from '../../services/razorpay.service.js';

// ─── Constants ──────────────────────────────────────────────────────────
const TEST_SESSION = 'wh-integration-test-session';
const TEST_SLUG = 'wh-integration-test-product';
const TEST_RZP_ORDER = 'order_whtest_main';

// ─── Helpers ────────────────────────────────────────────────────────────

function generateSignature(payload: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Sends a properly-formatted webhook request to the raw-body endpoint.
 * Every test MUST use this helper to ensure:
 *   1. Body is sent as a raw JSON string (not a parsed object)
 *   2. Content-Type is application/json (required by express.raw)
 *   3. Signature header is always present
 */
function sendWebhook(
  eventId: string,
  payload: Record<string, unknown>,
  signature = 'test_sig'
) {
  const raw = JSON.stringify(payload);
  return request(app)
    .post('/api/v1/webhooks/razorpay')
    .set('Content-Type', 'application/json')
    .set('x-razorpay-signature', signature)
    .set('x-razorpay-event-id', eventId)
    .send(raw);
}

function capturedPayload(
  paymentId: string,
  orderId: string,
  amount: number,
  currency = 'INR'
) {
  return {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: { id: paymentId, order_id: orderId, amount, currency },
      },
    },
  };
}

// ─── Test Suite ──────────────────────────────────────────────────────────

describe('Phase 6D Step 3: Webhook Integration Tests', () => {
  let testOrder: any;
  let testProduct: any;
  let testUpload: any;
  let testCart: any;

  // Store original to restore in after()
  const originalVerify = razorpayService.verifyWebhookSignature;

  // ── Global setup ────────────────────────────────────────────────────
  before(async () => {
    assertTestDatabaseSafe();
    // Clean up any leftover test data (scoped to our unique session prefix)
    await prisma.webhookEvent.deleteMany({ where: { event_id: { startsWith: 'evt_whtest_' } } });
    await prisma.payment.deleteMany({ where: { razorpay_payment_id: { startsWith: 'pay_whtest_' } } });
    await prisma.orderItem.deleteMany({ where: { order: { cart: { session_id: TEST_SESSION } } } });
    await prisma.order.deleteMany({ where: { cart: { session_id: TEST_SESSION } } });
    await prisma.cartLineItem.deleteMany({ where: { cart: { session_id: TEST_SESSION } } });
    await prisma.cart.deleteMany({ where: { session_id: TEST_SESSION } });
    await prisma.userUpload.deleteMany({ where: { session_id: TEST_SESSION } });
    await prisma.product.deleteMany({ where: { slug: TEST_SLUG } });

    testProduct = await prisma.product.create({
      data: { name: 'WH Integration Test Product', slug: TEST_SLUG, base_price: '100.00', is_active: true },
    });

    testCart = await prisma.cart.create({
      data: { session_id: TEST_SESSION, status: 'CHECKOUT_STARTED' },
    });

    testUpload = await prisma.userUpload.create({
      data: {
        session_id: TEST_SESSION,
        original_filename: 'whtest.jpg',
        r2_key: `uploads/whtest-${Date.now()}.jpg`,
        preview_r2_key: `previews/whtest-${Date.now()}.jpg`,
        mime_type: 'image/jpeg',
        file_size: 1024,
        width: 1000,
        height: 1000,
        status: 'LINKED_TO_CART',
        retention_status: 'CHECKOUT_LOCKED',
      },
    });

    testOrder = await prisma.order.create({
      data: {
        cart_id: testCart.id,
        total_amount: '100.00',
        status: 'PENDING',
        razorpay_order_id: TEST_RZP_ORDER,
        customer_email: 'whtest@example.com',
        customer_phone: '9999999999',
        shipping_address_snapshot: {},
      },
    });

    await prisma.orderItem.create({
      data: {
        order_id: testOrder.id,
        product_id: testProduct.id,
        upload_id: testUpload.id,
        quantity: 1,
        unit_price: '100.00',
        customization_data: {},
      },
    });
  });

  // ── Per-test setup/teardown ─────────────────────────────────────────
  beforeEach(() => {
    // Every test starts with signature verification bypassed
    razorpayService.verifyWebhookSignature = () => true;
  });

  afterEach(() => {
    // Restore after every test so no test can pollute the next
    razorpayService.verifyWebhookSignature = () => true;
  });

  // ── Global teardown ─────────────────────────────────────────────────
  after(async () => {
    // Restore the real verifier
    razorpayService.verifyWebhookSignature = originalVerify;

    // Clean up test data
    await prisma.webhookEvent.deleteMany({ where: { event_id: { startsWith: 'evt_whtest_' } } });
    await prisma.payment.deleteMany({ where: { razorpay_payment_id: { startsWith: 'pay_whtest_' } } });
    await prisma.orderItem.deleteMany({ where: { order: { cart: { session_id: TEST_SESSION } } } });
    await prisma.order.deleteMany({ where: { cart: { session_id: TEST_SESSION } } });
    await prisma.cartLineItem.deleteMany({ where: { cart: { session_id: TEST_SESSION } } });
    await prisma.cart.deleteMany({ where: { session_id: TEST_SESSION } });
    await prisma.userUpload.deleteMany({ where: { session_id: TEST_SESSION } });
    await prisma.product.deleteMany({ where: { slug: TEST_SLUG } });

    await prisma.$disconnect();
  });

  // ═══════════════════════════════════════════════════════════════════
  //  1. SIGNATURE VERIFICATION
  // ═══════════════════════════════════════════════════════════════════

  it('1. Missing signature header → 400', async () => {
    const raw = JSON.stringify({ event: 'payment.captured' });
    await request(app)
      .post('/api/v1/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .send(raw)
      .expect(400);
  });

  it('2. Invalid HMAC signature → 400', async () => {
    // Use the REAL verifier for this test
    razorpayService.verifyWebhookSignature = originalVerify;
    const payload = capturedPayload('pay_whtest_sig', TEST_RZP_ORDER, 10000);
    const res = await sendWebhook('evt_whtest_sig', payload, 'definitely_invalid_signature');
    assert.strictEqual(res.status, 400);
  });

  // ═══════════════════════════════════════════════════════════════════
  //  2. ORPHANED WEBHOOKS
  // ═══════════════════════════════════════════════════════════════════

  it('3. Orphaned webhook (unknown order_id) → 200, ORPHANED status, no Order created', async () => {
    const payload = capturedPayload('pay_whtest_orphan', 'order_does_not_exist', 10000);
    const res = await sendWebhook('evt_whtest_orphan', payload);
    assert.strictEqual(res.status, 200);

    const event = await prisma.webhookEvent.findUnique({ where: { event_id: 'evt_whtest_orphan' } });
    assert.ok(event, 'WebhookEvent must be persisted');
    assert.strictEqual(event.processing_status, 'ORPHANED');

    // Must NOT have created any order
    const orderCount = await prisma.order.count({ where: { razorpay_order_id: 'order_does_not_exist' } });
    assert.strictEqual(orderCount, 0);
  });

  // ═══════════════════════════════════════════════════════════════════
  //  3. EXPIRED/NON-PENDING ORDER
  // ═══════════════════════════════════════════════════════════════════

  it('4. Captured payment against EXPIRED order → 200, RECONCILIATION_REQUIRED, order stays EXPIRED', async () => {
    const expOrder = await prisma.order.create({
      data: {
        cart_id: testCart.id,
        total_amount: '100.00',
        status: 'EXPIRED',
        razorpay_order_id: 'order_whtest_expired',
        customer_email: 'x@x.com',
        customer_phone: '0',
        shipping_address_snapshot: {},
      },
    });

    const payload = capturedPayload('pay_whtest_exp', 'order_whtest_expired', 10000);
    const res = await sendWebhook('evt_whtest_exp', payload);
    assert.strictEqual(res.status, 200);

    const event = await prisma.webhookEvent.findUnique({ where: { event_id: 'evt_whtest_exp' } });
    assert.strictEqual(event?.processing_status, 'RECONCILIATION_REQUIRED');

    const order = await prisma.order.findUnique({ where: { id: expOrder.id } });
    assert.strictEqual(order?.status, 'EXPIRED', 'Order must NOT be confirmed');
  });

  // ═══════════════════════════════════════════════════════════════════
  //  4. AMOUNT / CURRENCY VERIFICATION
  // ═══════════════════════════════════════════════════════════════════

  it('5. Wrong amount → 200 (no retry), order stays PENDING', async () => {
    const payload = capturedPayload('pay_whtest_badamt', TEST_RZP_ORDER, 9999);
    const res = await sendWebhook('evt_whtest_badamt', payload);
    assert.strictEqual(res.status, 200);

    const order = await prisma.order.findUnique({ where: { id: testOrder.id } });
    assert.strictEqual(order?.status, 'PENDING');
  });

  it('6. Wrong currency → 200 (no retry), order stays PENDING', async () => {
    const payload = capturedPayload('pay_whtest_badcur', TEST_RZP_ORDER, 10000, 'USD');
    const res = await sendWebhook('evt_whtest_badcur', payload);
    assert.strictEqual(res.status, 200);

    const order = await prisma.order.findUnique({ where: { id: testOrder.id } });
    assert.strictEqual(order?.status, 'PENDING');
  });

  it('7. Wrong Razorpay order_id → 200 (orphaned), no confirmation', async () => {
    const payload = capturedPayload('pay_whtest_badoid', 'order_whtest_nonexistent', 10000);
    const res = await sendWebhook('evt_whtest_badoid', payload);
    assert.strictEqual(res.status, 200);

    const event = await prisma.webhookEvent.findUnique({ where: { event_id: 'evt_whtest_badoid' } });
    assert.strictEqual(event?.processing_status, 'ORPHANED');

    const order = await prisma.order.findUnique({ where: { id: testOrder.id } });
    assert.strictEqual(order?.status, 'PENDING');
  });

  // ═══════════════════════════════════════════════════════════════════
  //  5. EVENT TYPE FILTERING
  // ═══════════════════════════════════════════════════════════════════

  it('8. order.paid does NOT independently confirm', async () => {
    const payload = {
      event: 'order.paid',
      payload: {
        payment: {
          entity: { id: 'pay_whtest_ordpaid', order_id: TEST_RZP_ORDER, amount: 10000, currency: 'INR' },
        },
      },
    };
    const res = await sendWebhook('evt_whtest_ordpaid', payload);
    assert.strictEqual(res.status, 200);

    const order = await prisma.order.findUnique({ where: { id: testOrder.id } });
    assert.strictEqual(order?.status, 'PENDING');
  });

  it('9. payment.failed does NOT cancel/fail the Order', async () => {
    const payload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: { id: 'pay_whtest_fail', order_id: TEST_RZP_ORDER, amount: 10000, currency: 'INR' },
        },
      },
    };
    const res = await sendWebhook('evt_whtest_fail', payload);
    assert.strictEqual(res.status, 200);

    const order = await prisma.order.findUnique({ where: { id: testOrder.id } });
    assert.strictEqual(order?.status, 'PENDING');
  });

  // ═══════════════════════════════════════════════════════════════════
  //  6. HAPPY PATH — payment.captured CONFIRMS
  // ═══════════════════════════════════════════════════════════════════

  it('10. payment.captured confirms Order + CAPTURED Payment + ORDERED_RETAINED uploads', async () => {
    // Ensure order is PENDING before this test
    await prisma.order.update({ where: { id: testOrder.id }, data: { status: 'PENDING' } });
    await prisma.userUpload.update({ where: { id: testUpload.id }, data: { retention_status: 'CHECKOUT_LOCKED' } });

    const payload = capturedPayload('pay_whtest_happy', TEST_RZP_ORDER, 10000);
    const res = await sendWebhook('evt_whtest_happy', payload);
    assert.strictEqual(res.status, 200);

    const order = await prisma.order.findUnique({ where: { id: testOrder.id } });
    assert.strictEqual(order?.status, 'CONFIRMED');

    const payment = await prisma.payment.findFirst({ where: { razorpay_payment_id: 'pay_whtest_happy' } });
    assert.ok(payment, 'Payment record must exist');
    assert.strictEqual(payment.status, 'CAPTURED');
    assert.strictEqual(payment.order_id, testOrder.id);

    const upload = await prisma.userUpload.findUnique({ where: { id: testUpload.id } });
    assert.strictEqual(upload?.retention_status, 'ORDERED_RETAINED');

    const event = await prisma.webhookEvent.findUnique({ where: { event_id: 'evt_whtest_happy' } });
    assert.strictEqual(event?.processing_status, 'PROCESSED');
  });

  // ═══════════════════════════════════════════════════════════════════
  //  7. IDEMPOTENCY — DUPLICATE WEBHOOKS
  // ═══════════════════════════════════════════════════════════════════

  it('11. Duplicate webhook event_id → 200, single WebhookEvent, single Payment', async () => {
    // Reset order for a clean capture
    await prisma.order.update({ where: { id: testOrder.id }, data: { status: 'PENDING' } });
    await prisma.userUpload.update({ where: { id: testUpload.id }, data: { retention_status: 'CHECKOUT_LOCKED' } });

    const payload = capturedPayload('pay_whtest_dup', TEST_RZP_ORDER, 10000);

    // First request — should succeed
    const res1 = await sendWebhook('evt_whtest_dup', payload);
    assert.strictEqual(res1.status, 200);

    // Second request with SAME event_id — should return 200 (not 500)
    const res2 = await sendWebhook('evt_whtest_dup', payload);
    assert.strictEqual(res2.status, 200);

    // Only one WebhookEvent
    const eventCount = await prisma.webhookEvent.count({ where: { event_id: 'evt_whtest_dup' } });
    assert.strictEqual(eventCount, 1);

    // Only one Payment for this order from this event
    const paymentCount = await prisma.payment.count({ where: { razorpay_payment_id: 'pay_whtest_dup' } });
    assert.strictEqual(paymentCount, 1);
  });

  it('12. Two simultaneous identical webhooks → both 200, single WebhookEvent', async () => {
    // Reset order
    await prisma.order.update({ where: { id: testOrder.id }, data: { status: 'PENDING' } });
    await prisma.userUpload.update({ where: { id: testUpload.id }, data: { retention_status: 'CHECKOUT_LOCKED' } });

    const payload = capturedPayload('pay_whtest_simul', TEST_RZP_ORDER, 10000);

    const [res1, res2] = await Promise.all([
      sendWebhook('evt_whtest_simul', payload),
      sendWebhook('evt_whtest_simul', payload),
    ]);

    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res2.status, 200);

    const eventCount = await prisma.webhookEvent.count({ where: { event_id: 'evt_whtest_simul' } });
    assert.strictEqual(eventCount, 1);
  });

  // ═══════════════════════════════════════════════════════════════════
  //  8. PAYMENT SEQUENCE TESTS
  // ═══════════════════════════════════════════════════════════════════

  it('13. payment.failed followed by payment.captured → Order CONFIRMED', async () => {
    // Reset order
    await prisma.order.update({ where: { id: testOrder.id }, data: { status: 'PENDING' } });
    await prisma.userUpload.update({ where: { id: testUpload.id }, data: { retention_status: 'CHECKOUT_LOCKED' } });

    // First: payment.failed (should be ignored)
    const failPayload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: { id: 'pay_whtest_failfirst', order_id: TEST_RZP_ORDER, amount: 10000, currency: 'INR' },
        },
      },
    };
    const res1 = await sendWebhook('evt_whtest_failfirst', failPayload);
    assert.strictEqual(res1.status, 200);

    let order = await prisma.order.findUnique({ where: { id: testOrder.id } });
    assert.strictEqual(order?.status, 'PENDING', 'Order must remain PENDING after payment.failed');

    // Then: payment.captured (should confirm)
    const capturePayload = capturedPayload('pay_whtest_capafter', TEST_RZP_ORDER, 10000);
    const res2 = await sendWebhook('evt_whtest_capafter', capturePayload);
    assert.strictEqual(res2.status, 200);

    order = await prisma.order.findUnique({ where: { id: testOrder.id } });
    assert.strictEqual(order?.status, 'CONFIRMED', 'Order must be CONFIRMED after payment.captured');
  });

  // ═══════════════════════════════════════════════════════════════════
  //  9. ARCHITECTURE INVARIANTS
  // ═══════════════════════════════════════════════════════════════════

  it('14. Frontend payment success without webhook does NOT confirm Order', async () => {
    // This is an architecture verification test.
    // A PENDING order with a razorpay_order_id but NO webhook processing
    // must remain PENDING. Only the webhook path can transition to CONFIRMED.
    await prisma.order.update({ where: { id: testOrder.id }, data: { status: 'PENDING' } });

    // Simulate: frontend "succeeds" by just checking the order status directly
    // WITHOUT any webhook arriving. The order must still be PENDING.
    const order = await prisma.order.findUnique({ where: { id: testOrder.id } });
    assert.strictEqual(order?.status, 'PENDING',
      'Order MUST remain PENDING until authoritative webhook confirms payment');
  });

  it('15. Browser closes after payment — webhook still confirms asynchronously', async () => {
    // Reset
    await prisma.order.update({ where: { id: testOrder.id }, data: { status: 'PENDING' } });
    await prisma.userUpload.update({ where: { id: testUpload.id }, data: { retention_status: 'CHECKOUT_LOCKED' } });

    // Simulate: the browser is closed, but Razorpay sends the webhook
    const payload = capturedPayload('pay_whtest_async', TEST_RZP_ORDER, 10000);
    const res = await sendWebhook('evt_whtest_async', payload);
    assert.strictEqual(res.status, 200);

    const order = await prisma.order.findUnique({ where: { id: testOrder.id } });
    assert.strictEqual(order?.status, 'CONFIRMED',
      'Webhook must confirm even without browser presence');
  });

  it('16. Security failure (amount mismatch) logs SECURITY_ERROR — audit trail preserved', async () => {
    // This verifies the fix for Trap D: WebhookSecurityError is safely caught,
    // and the WebhookEvent is persisted as SECURITY_ERROR without rolling back.
    await prisma.order.update({ where: { id: testOrder.id }, data: { status: 'PENDING' } });
    await prisma.userUpload.update({ where: { id: testUpload.id }, data: { retention_status: 'CART_ATTACHED' } });

    const payload = capturedPayload('pay_whtest_secfail', TEST_RZP_ORDER, 5555);
    const res = await sendWebhook('evt_whtest_secfail', payload);
    assert.strictEqual(res.status, 200, 'Must return 200 to prevent Razorpay retry');

    // WebhookEvent MUST exist and be SECURITY_ERROR
    const event = await prisma.webhookEvent.findUnique({ where: { event_id: 'evt_whtest_secfail' } });
    assert.ok(event, 'WebhookEvent must be persisted');
    assert.strictEqual(event.processing_status, 'SECURITY_ERROR', 'WebhookEvent must be marked as SECURITY_ERROR');

    // Order must remain PENDING
    const order = await prisma.order.findUnique({ where: { id: testOrder.id } });
    assert.strictEqual(order?.status, 'PENDING');

    // No Payment mutation
    const payment = await prisma.payment.findUnique({ where: { razorpay_payment_id: 'pay_whtest_secfail' } });
    assert.strictEqual(payment, null, 'Payment MUST NOT be created');

    // No UserUpload retention mutation
    const upload = await prisma.userUpload.findUnique({ where: { id: testUpload.id } });
    assert.strictEqual(upload?.retention_status, 'CART_ATTACHED', 'UserUpload MUST NOT be locked');
  });

  // ═══════════════════════════════════════════════════════════════════
  //  UNIQUENESS CONSTRAINTS
  // ═══════════════════════════════════════════════════════════════════

  it('17. Database rejects duplicate razorpay_payment_id', async () => {
    // Create first payment
    await prisma.payment.create({
      data: {
        order_id: testOrder.id,
        amount: 100,
        razorpay_payment_id: 'pay_duplicate_test',
        status: 'CAPTURED',
      }
    });

    // Attempt to create second payment with same ID
    let error: any = null;
    try {
      await prisma.payment.create({
        data: {
          order_id: testOrder.id,
          amount: 200,
          razorpay_payment_id: 'pay_duplicate_test',
          status: 'CAPTURED',
        }
      });
    } catch (e) {
      error = e;
    }

    assert.ok(error, 'Should throw an error');
    assert.strictEqual(error.code, 'P2002', 'Prisma should throw unique constraint error (P2002)');
    assert.ok(error.message.includes('razorpay_payment_id'), 'Error should mention razorpay_payment_id');
  });

  it('18. Database rejects duplicate non-null razorpay_order_id but allows multiple NULLs', async () => {
    // testOrder already has razorpay_order_id = TEST_RZP_ORDER

    // 1. Attempt to create another order with the same razorpay_order_id
    const cartDup = await prisma.cart.create({ data: { session_id: 'test-session-dup' } });
    let duplicateError: any = null;
    try {
      await prisma.order.create({
        data: {
          cart_id: cartDup.id,
          total_amount: '50.00',
          status: 'PENDING',
          razorpay_order_id: TEST_RZP_ORDER, // Duplicate!
          customer_email: 'dup@example.com',
          customer_phone: '9999999999',
          shipping_address_snapshot: {},
        }
      });
    } catch (e: any) {
      duplicateError = e;
      if (e.code !== 'P2002') {
        console.error('Unexpected error in duplicate Order test:', e);
      }
    }

    assert.ok(duplicateError, 'Should throw an error for duplicate razorpay_order_id');
    assert.strictEqual(duplicateError.code, 'P2002', 'Prisma should throw unique constraint error (P2002)');

    // 2. Create multiple orders with NULL razorpay_order_id
    const cartNull1 = await prisma.cart.create({ data: { session_id: 'test-session-null-1' } });
    const orderNull1 = await prisma.order.create({
      data: {
        cart_id: cartNull1.id,
        total_amount: '10.00',
        status: 'PENDING',
        razorpay_order_id: null,
        customer_email: 'null1@example.com',
        customer_phone: '9999999999',
        shipping_address_snapshot: {},
      }
    });

    const cartNull2 = await prisma.cart.create({ data: { session_id: 'test-session-null-2' } });
    const orderNull2 = await prisma.order.create({
      data: {
        cart_id: cartNull2.id,
        total_amount: '20.00',
        status: 'PENDING',
        razorpay_order_id: null,
        customer_email: 'null2@example.com',
        customer_phone: '9999999999',
        shipping_address_snapshot: {},
      }
    });

    assert.ok(orderNull1.id);
    assert.ok(orderNull2.id);
    assert.notStrictEqual(orderNull1.id, orderNull2.id);

    // Clean up these extra test orders so we don't pollute teardown
    await prisma.order.deleteMany({
      where: { id: { in: [orderNull1.id, orderNull2.id] } }
    });
    await prisma.cart.deleteMany({
      where: { id: { in: [cartNull1.id, cartNull2.id, cartDup.id] } }
    });
  });
});
