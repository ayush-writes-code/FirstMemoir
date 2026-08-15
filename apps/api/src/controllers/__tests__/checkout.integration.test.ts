import { assertTestDatabaseSafe } from "../../utils/test-safety.js";

/**
 * Phase 6D Step 2 Integration Tests
 *
 * Uses node:test + supertest (same as existing catalog.integration.test.ts).
 * Product/option data is created without Decimal constructors — Prisma accepts
 * plain numeric strings/numbers for Decimal fields.
 *
 * Session cookies are obtained by calling GET /api/v1/cart which sets the cookie
 * automatically (via the ensureCartSession middleware). We capture the Set-Cookie
 * header and reuse it for subsequent requests.
 *
 * Covers:
 *   Step 2A  — GET /api/v1/cart
 *   Step 2B  — PATCH /api/v1/cart/items/:id, DELETE /api/v1/cart/items/:id
 *   Step 2C  — POST /api/v1/checkout/initialize
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../index.js';
import { prisma } from '@repo/database';
import { razorpayService } from '../../services/razorpay.service.js';

// Mock Razorpay SDK creation
const originalCreateOrder = razorpayService.createOrder;
before(() => {
  razorpayService.createOrder = async (amount: number, receipt: string) => {
    return {
      id: `rzp_test_order_${Date.now()}`,
      entity: 'order',
      amount,
      amount_paid: 0,
      amount_due: amount,
      currency: 'INR',
      receipt,
      status: 'created',
      attempts: 0,
      created_at: Math.floor(Date.now() / 1000)
    } as any;
  };
});

after(() => {
  razorpayService.createOrder = originalCreateOrder;
});

// ─── Shared test fixtures ─────────────────────────────────────────────────────

let testProduct: any;
let testSizeValue: any;
let testFinishValue: any;

before(async () => {
  assertTestDatabaseSafe();
  // Clean any residual test data from previous runs
  await prisma.order.deleteMany({ where: { cart: { session_id: { startsWith: 'integration-6d-' } } } });
  await prisma.cartLineItem.deleteMany({
    where: { cart: { session_id: { startsWith: 'integration-6d-' } } }
  });
  await prisma.cart.deleteMany({ where: { session_id: { startsWith: 'integration-6d-' } } });
  await prisma.userUpload.deleteMany({ where: { session_id: { startsWith: 'integration-6d-' } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: 'test-6d2-' } } });

  // Create a test product: base_price=50
  testProduct = await prisma.product.create({
    data: {
      name: '6D-Step2 Test Print',
      slug: 'test-6d2-print',
      base_price: '50.00',
      is_active: true,
    }
  });

  // Size option — 8x10 with metadata (FLAT +10) = unit_price 60
  const sizeOption = await prisma.productOption.create({
    data: {
      product_id: testProduct.id,
      name: 'Size',
      input_type: 'SELECT',
      is_required: true,
      sort_order: 0,
    }
  });
  testSizeValue = await prisma.productOptionValue.create({
    data: {
      option_id: sizeOption.id,
      value: '8x10',
      modifier_type: 'FLAT',
      price_modifier: '10.00',
      metadata: { width: 8, height: 10, unit: 'in' },
      is_active: true,
      sort_order: 0,
    }
  });

  // Finish option — Matte (FLAT +5) for later tests
  const finishOption = await prisma.productOption.create({
    data: {
      product_id: testProduct.id,
      name: 'Finish',
      input_type: 'SELECT',
      is_required: false,
      sort_order: 1,
    }
  });
  testFinishValue = await prisma.productOptionValue.create({
    data: {
      option_id: finishOption.id,
      value: 'Matte',
      modifier_type: 'FLAT',
      price_modifier: '5.00',
      is_active: true,
      sort_order: 0,
    }
  });
});

after(async () => {
  await prisma.order.deleteMany({ where: { cart: { session_id: { startsWith: 'integration-6d-' } } } });
  await prisma.cartLineItem.deleteMany({
    where: { cart: { session_id: { startsWith: 'integration-6d-' } } }
  });
  await prisma.cart.deleteMany({ where: { session_id: { startsWith: 'integration-6d-' } } });
  await prisma.userUpload.deleteMany({ where: { session_id: { startsWith: 'integration-6d-' } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: 'test-6d2-' } } });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a fresh supertest session and returns the signed session cookie.
 * The GET /cart endpoint sets the cart_session cookie if one doesn't exist.
 */
async function newSession(): Promise<{ cookie: string; agentRequest: any }> {
  const agent = request.agent(app);
  await agent.get('/api/v1/cart').expect(200);
  return { cookie: '', agentRequest: agent };
}

/**
 * Creates a new cart session via an agent (which persists cookies).
 */
function makeAgent() {
  return request.agent(app);
}

/**
 * Creates a test UserUpload directly in the DB.
 * The session_id is derived from the actual cart session by reading it from the DB.
 */
async function createUploadForSession(sessionId: string, retentionStatus = 'UNATTACHED') {
  // 2400x3000 pixels → 8x10 print at exactly 300 DPI
  return prisma.userUpload.create({
    data: {
      session_id: sessionId,
      original_filename: 'test.jpg',
      r2_key: `uploads/integration-6d-${Date.now()}.jpg`,
      preview_r2_key: `previews/integration-6d-${Date.now()}.jpg`,
      mime_type: 'image/jpeg',
      file_size: 1024000,
      width: 2400,   // 2400 / 8 inches = 300 DPI
      height: 3000,  // 3000 / 10 inches = 300 DPI
      status: 'READY',
      retention_status: retentionStatus as any,
    }
  });
}

/**
 * Adds an item to the cart via the API using an agent.
 * Default quality is EXCELLENT, DPI 300 (matches 2400x3000 at 8x10).
 */
async function addItem(
  agent: any,
  uploadId: string,
  optionIds: string[],
  quality = 'EXCELLENT',
  acknowledged = false,
  dpi = 300
) {
  return agent
    .post('/api/v1/cart/items')
    .send({
      product_id: testProduct.id,
      quantity: 1,
      selected_option_value_ids: optionIds,
      upload_id: uploadId,
      preview_url: 'https://example.com/preview.jpg',
      orientation: 'PORTRAIT',
      // crop covers full image (width=1, height=1) → crop px = 2400x3000
      // print target = 8x10 inches → DPI = 2400/8 = 300 ✓
      crop: { x: 0, y: 0, width: 1, height: 1, aspect_ratio: '8:10' },
      rotation: 0,
      zoom: 1,
      effective_dpi: dpi,
      print_quality_status: quality,
      dpi_acknowledged: acknowledged,
    });
}

const validShipping = {
  name: 'Test Customer',
  line1: '123 Test Street',
  city: 'Mumbai',
  state: 'Maharashtra',
  postal_code: '400001',
  country: 'IN',
};

// ─── Step 2A: GET /api/v1/cart ────────────────────────────────────────────────

describe('Step 2A: GET /api/v1/cart', () => {
  it('creates an empty cart for a new session and returns success envelope', async () => {
    const agent = makeAgent();
    const res = await agent.get('/api/v1/cart').expect(200);

    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data);
    assert.ok(Array.isArray(res.body.data.items));
    assert.strictEqual(res.body.data.items.length, 0);
  });

  it('SECURITY: GET /cart response never contains r2_key or master_file_key', async () => {
    const agent = makeAgent();

    // Get the cart (which sets the session cookie)
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cartId = cartRes.body.data.id;

    // Find the session_id from the DB
    const cart = await prisma.cart.findUnique({ where: { id: cartId } });
    const upload = await createUploadForSession(cart!.session_id!);

    await addItem(agent, upload.id, [testSizeValue.id]);

    const res = await agent.get('/api/v1/cart').expect(200);

    const json = JSON.stringify(res.body);
    assert.ok(!json.includes('"r2_key"'), 'r2_key must not appear in cart response');
    assert.ok(!json.includes('"master_file_key"'), 'master_file_key must not appear in cart response');

    // Cleanup
    await prisma.cart.delete({ where: { id: cartId } });
    await prisma.userUpload.deleteMany({ where: { id: upload.id } });
  });

  it('returns upload_id and preview_url in cart response — never internal storage paths', async () => {
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cart = await prisma.cart.findUnique({ where: { id: cartRes.body.data.id } });
    const upload = await createUploadForSession(cart!.session_id!);

    await addItem(agent, upload.id, [testSizeValue.id]);

    const res = await agent.get('/api/v1/cart').expect(200);
    const item = res.body.data.items[0];
    assert.ok(item, 'cart must have an item');
    assert.ok(item.upload_id, 'upload_id must be present');
    assert.ok(item.preview_url, 'preview_url must be present');
    assert.strictEqual(item.upload_id, upload.id);

    // Cleanup
    await prisma.cart.deleteMany({ where: { session_id: cart!.session_id! } });
    await prisma.userUpload.deleteMany({ where: { id: upload.id } });
  });

  it('calculates authoritative price: base(50) + size modifier(10) = 60', async () => {
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cart = await prisma.cart.findUnique({ where: { id: cartRes.body.data.id } });
    const upload = await createUploadForSession(cart!.session_id!);

    await addItem(agent, upload.id, [testSizeValue.id]);

    const res = await agent.get('/api/v1/cart').expect(200);
    const item = res.body.data.items[0];
    assert.strictEqual(item.unit_price, 60, 'unit_price must be base(50) + size modifier(10) = 60');

    // Cleanup
    await prisma.cart.deleteMany({ where: { session_id: cart!.session_id! } });
    await prisma.userUpload.deleteMany({ where: { id: upload.id } });
  });
});

// ─── Step 2B: PATCH and DELETE /api/v1/cart/items/:id ───────────────────────

describe('Step 2B: Cart Mutations', () => {
  it('rejects quantity=0 with 400', async () => {
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cart = await prisma.cart.findUnique({ where: { id: cartRes.body.data.id } });
    const upload = await createUploadForSession(cart!.session_id!);

    const addRes = await addItem(agent, upload.id, [testSizeValue.id]);
    const itemId = addRes.body.data.id;

    await agent
      .patch(`/api/v1/cart/items/${itemId}`)
      .send({ quantity: 0 })
      .expect(400);

    // Cleanup
    await prisma.cart.deleteMany({ where: { session_id: cart!.session_id! } });
    await prisma.userUpload.deleteMany({ where: { id: upload.id } });
  });

  it('rejects quantity > 999 with 400', async () => {
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cart = await prisma.cart.findUnique({ where: { id: cartRes.body.data.id } });
    const upload = await createUploadForSession(cart!.session_id!);

    const addRes = await addItem(agent, upload.id, [testSizeValue.id]);
    const itemId = addRes.body.data.id;

    await agent
      .patch(`/api/v1/cart/items/${itemId}`)
      .send({ quantity: 1000 })
      .expect(400);

    // Cleanup
    await prisma.cart.deleteMany({ where: { session_id: cart!.session_id! } });
    await prisma.userUpload.deleteMany({ where: { id: upload.id } });
  });

  it('accepts valid quantity update within 1–999', async () => {
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cart = await prisma.cart.findUnique({ where: { id: cartRes.body.data.id } });
    const upload = await createUploadForSession(cart!.session_id!);

    const addRes = await addItem(agent, upload.id, [testSizeValue.id]);
    const itemId = addRes.body.data.id;

    const patchRes = await agent
      .patch(`/api/v1/cart/items/${itemId}`)
      .send({ quantity: 3 })
      .expect(200);

    assert.strictEqual(patchRes.body.data.quantity, 3);

    // Cleanup
    await prisma.cart.deleteMany({ where: { session_id: cart!.session_id! } });
    await prisma.userUpload.deleteMany({ where: { id: upload.id } });
  });

  it('rejects unauthorized cart access from a different session', async () => {
    const ownerAgent = makeAgent();
    const cartRes = await ownerAgent.get('/api/v1/cart').expect(200);
    const cart = await prisma.cart.findUnique({ where: { id: cartRes.body.data.id } });
    const upload = await createUploadForSession(cart!.session_id!);

    const addRes = await addItem(ownerAgent, upload.id, [testSizeValue.id]);
    const itemId = addRes.body.data.id;

    // Different session (a different agent with a different cookie)
    const attackerAgent = makeAgent();
    await attackerAgent.get('/api/v1/cart').expect(200); // creates new session

    await attackerAgent
      .patch(`/api/v1/cart/items/${itemId}`)
      .send({ quantity: 2 })
      .expect(403);

    // Cleanup
    await prisma.cart.deleteMany({ where: { session_id: cart!.session_id! } });
    await prisma.userUpload.deleteMany({ where: { id: upload.id } });
  });

  it('DELETE: transitions CART_ATTACHED upload to UNATTACHED when the last cart item is deleted', async () => {
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cart = await prisma.cart.findUnique({ where: { id: cartRes.body.data.id } });
    const upload = await createUploadForSession(cart!.session_id!);

    const addRes = await addItem(agent, upload.id, [testSizeValue.id]);
    assert.strictEqual(addRes.status, 201, 'add-to-cart should succeed');
    const itemId = addRes.body.data.id;

    // Upload should now be CART_ATTACHED
    const before = await prisma.userUpload.findUnique({ where: { id: upload.id } });
    assert.strictEqual(before?.retention_status, 'CART_ATTACHED');

    await agent.delete(`/api/v1/cart/items/${itemId}`).expect(200);

    // Upload must be downgraded to UNATTACHED
    const after = await prisma.userUpload.findUnique({ where: { id: upload.id } });
    assert.strictEqual(
      after?.retention_status,
      'UNATTACHED',
      'Orphaned upload must be downgraded to UNATTACHED on item deletion'
    );

    // Cleanup
    await prisma.cart.deleteMany({ where: { session_id: cart!.session_id! } });
    await prisma.userUpload.deleteMany({ where: { id: upload.id } });
  });

  it('DELETE: NEVER downgrades a CHECKOUT_LOCKED upload', async () => {
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cart = await prisma.cart.findUnique({ where: { id: cartRes.body.data.id } });
    const upload = await createUploadForSession(cart!.session_id!);

    const addRes = await addItem(agent, upload.id, [testSizeValue.id]);
    const itemId = addRes.body.data.id;

    // Force upload to CHECKOUT_LOCKED
    await prisma.userUpload.update({
      where: { id: upload.id },
      data: { retention_status: 'CHECKOUT_LOCKED' }
    });

    await agent.delete(`/api/v1/cart/items/${itemId}`).expect(200);

    // Must still be CHECKOUT_LOCKED
    const after = await prisma.userUpload.findUnique({ where: { id: upload.id } });
    assert.strictEqual(
      after?.retention_status,
      'CHECKOUT_LOCKED',
      'CHECKOUT_LOCKED upload must NEVER be downgraded by cart item deletion'
    );

    // Cleanup
    await prisma.cart.deleteMany({ where: { session_id: cart!.session_id! } });
    await prisma.userUpload.deleteMany({ where: { id: upload.id } });
  });
});

// ─── Step 2C: POST /api/v1/checkout/initialize ───────────────────────────────

describe('Step 2C: POST /api/v1/checkout/initialize', () => {
  it('rejects guest checkout without customer_email (400)', async () => {
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cart = await prisma.cart.findUnique({ where: { id: cartRes.body.data.id } });
    const upload = await createUploadForSession(cart!.session_id!);
    await addItem(agent, upload.id, [testSizeValue.id]);

    const res = await agent
      .post('/api/v1/checkout/initialize')
      .send({ customer_phone: '+919876543210', shipping_address: validShipping })
      .expect(400);

    assert.ok(
      res.body.error?.toLowerCase().includes('email'),
      `Expected email error, got: ${res.body.error}`
    );

    // Cleanup
    await prisma.cart.deleteMany({ where: { session_id: cart!.session_id! } });
    await prisma.userUpload.deleteMany({ where: { id: upload.id } });
  });

  it('rejects guest checkout without customer_phone (400)', async () => {
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cart = await prisma.cart.findUnique({ where: { id: cartRes.body.data.id } });
    const upload = await createUploadForSession(cart!.session_id!);
    await addItem(agent, upload.id, [testSizeValue.id]);

    const res = await agent
      .post('/api/v1/checkout/initialize')
      .send({ customer_email: 'test@example.com', shipping_address: validShipping })
      .expect(400);

    assert.ok(
      res.body.error?.toLowerCase().includes('phone'),
      `Expected phone error, got: ${res.body.error}`
    );

    // Cleanup
    await prisma.cart.deleteMany({ where: { session_id: cart!.session_id! } });
    await prisma.userUpload.deleteMany({ where: { id: upload.id } });
  });

  it('rejects checkout for a LOW_QUALITY item without dpi_acknowledged (authoritative DB state, 400)', async () => {
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cartId = cartRes.body.data.id;
    const cart = await prisma.cart.findUnique({ where: { id: cartId } });
    const upload = await createUploadForSession(cart!.session_id!);

    // Directly insert a VALIDATED line item with LOW_QUALITY + dpi_acknowledged=false
    // (bypassing addToCart which would require dpi_acknowledged=true for LOW_QUALITY)
    await prisma.cartLineItem.create({
      data: {
        cart_id: cartId,
        product_id: testProduct.id,
        quantity: 1,
        status: 'VALIDATED',
        upload_id: upload.id,
        preview_url: 'https://example.com/preview.jpg',
        orientation: 'PORTRAIT',
        crop_x: 0, crop_y: 0, crop_width: 1, crop_height: 1,
        crop_aspect_ratio: '8:10',
        rotation: 0,
        zoom: 1,
        effective_dpi: 75,
        print_quality_status: 'LOW_QUALITY',
        dpi_acknowledged: false, // Authoritative state: NOT acknowledged
        pricing_version: 1,
        selected_option_values: {
          create: [{ product_option_value_id: testSizeValue.id }]
        }
      }
    });
    // Also set retention status
    await prisma.userUpload.update({
      where: { id: upload.id },
      data: { status: 'LINKED_TO_CART', retention_status: 'CART_ATTACHED' }
    });

    const res = await agent
      .post('/api/v1/checkout/initialize')
      .send({
        customer_email: 'test@example.com',
        customer_phone: '+919876543210',
        shipping_address: validShipping,
      })
      .expect(400);

    assert.ok(
      res.body.error?.toLowerCase().includes('acknowledg') ||
      res.body.error?.toLowerCase().includes('quality'),
      `Expected acknowledgment/quality error, got: ${res.body.error}`
    );

    // Cleanup
    await prisma.cartLineItem.deleteMany({ where: { cart_id: cartId } });
    await prisma.cart.deleteMany({ where: { id: cartId } });
    await prisma.userUpload.deleteMany({ where: { id: upload.id } });
  });

  it('returns 409 for a cart with STALE items — does NOT modify the cart', async () => {
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cartId = cartRes.body.data.id;
    const cart = await prisma.cart.findUnique({ where: { id: cartId } });
    const upload = await createUploadForSession(cart!.session_id!);

    // Insert a STALE cart item directly
    const staleItem = await prisma.cartLineItem.create({
      data: {
        cart_id: cartId,
        product_id: testProduct.id,
        quantity: 1,
        status: 'STALE',
        upload_id: upload.id,
        preview_url: 'https://example.com/preview.jpg',
        orientation: 'PORTRAIT',
        crop_x: 0, crop_y: 0, crop_width: 1, crop_height: 1,
        crop_aspect_ratio: '8:10',
        rotation: 0,
        zoom: 1,
        effective_dpi: 300,
        print_quality_status: 'EXCELLENT',
        dpi_acknowledged: false,
        pricing_version: 1,
        selected_option_values: {
          create: [{ product_option_value_id: testSizeValue.id }]
        }
      }
    });

    await agent
      .post('/api/v1/checkout/initialize')
      .send({
        customer_email: 'test@example.com',
        customer_phone: '+919876543210',
        shipping_address: validShipping,
      })
      .expect(409);

    // Verify the stale item was NOT deleted or modified
    const staleItemAfter = await prisma.cartLineItem.findUnique({ where: { id: staleItem.id } });
    assert.ok(staleItemAfter, 'Stale cart item must NOT be deleted by checkout');
    assert.strictEqual(staleItemAfter.status, 'STALE');

    // Cleanup
    await prisma.cartLineItem.deleteMany({ where: { cart_id: cartId } });
    await prisma.cart.deleteMany({ where: { id: cartId } });
    await prisma.userUpload.deleteMany({ where: { id: upload.id } });
  });

  it('creates immutable snapshot with physical dimensions, dpi_acknowledged, and correct pricing', async () => {
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cartId = cartRes.body.data.id;
    const cart = await prisma.cart.findUnique({ where: { id: cartId } });
    const upload = await createUploadForSession(cart!.session_id!);

    // Add an EXCELLENT quality item with dpi_acknowledged=true
    const addRes = await addItem(agent, upload.id, [testSizeValue.id], 'EXCELLENT', true, 300);
    assert.strictEqual(addRes.status, 201, `add-to-cart failed: ${JSON.stringify(addRes.body)}`);

    // Force dpi_acknowledged=true (add already did, but be explicit)
    await prisma.cartLineItem.updateMany({
      where: { cart_id: cartId },
      data: { dpi_acknowledged: true }
    });

    const res = await agent
      .post('/api/v1/checkout/initialize')
      .send({
        customer_email: 'test@example.com',
        customer_phone: '+919876543210',
        shipping_address: validShipping,
      })
      .expect(200);

    assert.strictEqual(res.body.success, true);
    const { order_id } = res.body.data;
    assert.ok(order_id, 'order_id must be returned');

    // SECURITY: master_file_key must NOT appear in the API response
    const apiJson = JSON.stringify(res.body);
    assert.ok(!apiJson.includes('"master_file_key"'), 'master_file_key must NEVER appear in API response');

    // Inspect the immutable DB snapshot
    const orderItem = await prisma.orderItem.findFirst({ where: { order_id } });
    assert.ok(orderItem, 'OrderItem must be created');

    const snap = orderItem!.customization_data as any;

    // schema_version
    assert.strictEqual(snap.schema_version, '1.0');

    // Physical dimensions — explicit immutable target
    assert.strictEqual(snap.physical_width, 8, 'physical_width must be 8');
    assert.strictEqual(snap.physical_height, 10, 'physical_height must be 10');
    assert.strictEqual(snap.physical_dimension_unit, 'in', 'unit must be "in"');

    // canonical pixel dimensions
    assert.ok(snap.canonical_dimensions, 'canonical_dimensions must be present');
    assert.strictEqual(snap.canonical_dimensions.width, 2400);
    assert.strictEqual(snap.canonical_dimensions.height, 3000);

    // dpi_acknowledged from authoritative CartLineItem (not request payload)
    assert.strictEqual(snap.dpi_acknowledged, true, 'dpi_acknowledged must be true in snapshot');

    // Authoritative price: base(50) + size(10) = 60
    assert.strictEqual(snap.unit_price, 60, 'unit_price must be 60');

    // master_file_key in DB snapshot (for manufacturing only)
    assert.ok(snap.master_file_key, 'master_file_key must be in DB snapshot');

    // Cleanup
    await prisma.order.delete({ where: { id: order_id } });
    await prisma.cartLineItem.deleteMany({ where: { cart_id: cartId } });
    await prisma.cart.deleteMany({ where: { id: cartId } });
    await prisma.userUpload.deleteMany({ where: { id: upload.id } });
  });

  it('snapshot physical_dimensions remain unchanged if product option is renamed post-checkout', async () => {
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cartId = cartRes.body.data.id;
    const cart = await prisma.cart.findUnique({ where: { id: cartId } });
    const upload = await createUploadForSession(cart!.session_id!);

    await addItem(agent, upload.id, [testSizeValue.id], 'EXCELLENT', true, 300);

    const res = await agent
      .post('/api/v1/checkout/initialize')
      .send({
        customer_email: 'test@example.com',
        customer_phone: '+919876543210',
        shipping_address: validShipping,
      })
      .expect(200);

    const { order_id } = res.body.data;

    // Simulate admin renaming the option value post-checkout
    await prisma.productOptionValue.update({
      where: { id: testSizeValue.id },
      data: { value: 'Standard Size (renamed after checkout)' }
    });

    const orderItem = await prisma.orderItem.findFirst({ where: { order_id } });
    const snap = orderItem!.customization_data as any;

    assert.strictEqual(snap.physical_width, 8, 'physical_width must be unchanged after option rename');
    assert.strictEqual(snap.physical_height, 10, 'physical_height must be unchanged after option rename');

    // Restore
    await prisma.productOptionValue.update({
      where: { id: testSizeValue.id },
      data: { value: '8x10' }
    });

    // Cleanup
    await prisma.order.delete({ where: { id: order_id } });
    await prisma.cartLineItem.deleteMany({ where: { cart_id: cartId } });
    await prisma.cart.deleteMany({ where: { id: cartId } });
    await prisma.userUpload.deleteMany({ where: { id: upload.id } });
  });

  it('double-click checkout with identical cart reuses the same PENDING order', async () => {
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cartId = cartRes.body.data.id;
    const cart = await prisma.cart.findUnique({ where: { id: cartId } });
    const upload = await createUploadForSession(cart!.session_id!);

    await addItem(agent, upload.id, [testSizeValue.id]);

    const body = {
      customer_email: 'test@example.com',
      customer_phone: '+919876543210',
      shipping_address: validShipping,
    };

    const res1 = await agent.post('/api/v1/checkout/initialize').send(body).expect(200);
    const res2 = await agent.post('/api/v1/checkout/initialize').send(body).expect(200);

    assert.strictEqual(
      res1.body.data.order_id,
      res2.body.data.order_id,
      'Identical double-click must reuse the same PENDING order'
    );

    // Verify exactly one PENDING order exists
    const pendingOrders = await prisma.order.findMany({
      where: { cart_id: cartId, status: 'PENDING' }
    });
    assert.strictEqual(pendingOrders.length, 1, 'Must have exactly one PENDING order');

    // Cleanup
    await prisma.order.deleteMany({ where: { cart_id: cartId } });
    await prisma.cartLineItem.deleteMany({ where: { cart_id: cartId } });
    await prisma.cart.deleteMany({ where: { id: cartId } });
    await prisma.userUpload.deleteMany({ where: { id: upload.id } });
  });

  it('uploads are atomically transitioned CART_ATTACHED → CHECKOUT_LOCKED during checkout', async () => {
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cartId = cartRes.body.data.id;
    const cart = await prisma.cart.findUnique({ where: { id: cartId } });
    const upload = await createUploadForSession(cart!.session_id!);

    await addItem(agent, upload.id, [testSizeValue.id]);

    // Confirm upload is CART_ATTACHED before checkout
    const before = await prisma.userUpload.findUnique({ where: { id: upload.id } });
    assert.strictEqual(before?.retention_status, 'CART_ATTACHED');

    const res = await agent
      .post('/api/v1/checkout/initialize')
      .send({
        customer_email: 'test@example.com',
        customer_phone: '+919876543210',
        shipping_address: validShipping,
      })
      .expect(200);

    // Upload must be CHECKOUT_LOCKED post-checkout
    const after = await prisma.userUpload.findUnique({ where: { id: upload.id } });
    assert.strictEqual(
      after?.retention_status,
      'CHECKOUT_LOCKED',
      'Upload must be CHECKOUT_LOCKED atomically with Order creation'
    );

    // Cart must be CHECKOUT_STARTED
    const cartAfter = await prisma.cart.findUnique({ where: { id: cartId } });
    assert.strictEqual(cartAfter?.status, 'CHECKOUT_STARTED');

    // Cleanup
    await prisma.order.deleteMany({ where: { id: res.body.data.order_id } });
    await prisma.cartLineItem.deleteMany({ where: { cart_id: cartId } });
    await prisma.cart.deleteMany({ where: { id: cartId } });
    await prisma.userUpload.deleteMany({ where: { id: upload.id } });
  });
});
