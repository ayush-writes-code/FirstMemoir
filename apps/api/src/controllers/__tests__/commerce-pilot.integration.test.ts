import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../index.js';
import { prisma } from '@repo/database';
import { razorpayService } from '../../services/razorpay.service.js';
import { assertTestDatabaseSafe } from '../../utils/test-safety.js';

// Mock Razorpay SDK creation
const originalCreateOrder = razorpayService.createOrder;
const originalFetchOrder = razorpayService.fetchOrder;

let standardProduct: any;
let testFixturePersonalizedProduct: any;
let sizeOptionValue: any;

const validShipping = {
  name: 'Test Buyer',
  line1: '123 Test Street',
  city: 'Bengaluru',
  state: 'Karnataka',
  postal_code: '560001',
  country: 'IN',
};

async function createUploadForSession(sessionId: string) {
  return prisma.userUpload.create({
    data: {
      session_id: sessionId,
      original_filename: 'test.jpg',
      r2_key: `uploads/slice4-${Date.now()}.jpg`,
      preview_r2_key: `previews/slice4-${Date.now()}.jpg`,
      mime_type: 'image/jpeg',
      file_size: 1024000,
      width: 2400,
      height: 3000,
      status: 'READY',
      retention_status: 'UNATTACHED',
    }
  });
}

function makeAgent() {
  return request.agent(app);
}

before(async () => {
  assertTestDatabaseSafe();
  
  razorpayService.createOrder = async (amount: number, receipt: string) => {
    return {
      id: `rzp_test_order_${Date.now()}_${Math.random().toString(36).substring(7)}`,
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
  razorpayService.fetchOrder = async (orderId: string) => {
    return {
      id: orderId,
      entity: 'order',
      amount: 10000,
      amount_paid: 0,
      amount_due: 10000,
      currency: 'INR',
      status: 'created',
      attempts: 0,
      created_at: Math.floor(Date.now() / 1000)
    } as any;
  };

  // Clean test data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartLineItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.userUpload.deleteMany();
  
  const testProds = await prisma.product.findMany({ where: { slug: { startsWith: 'test-slice4-' } } });
  for (const p of testProds) {
    await prisma.productOptionValue.deleteMany({ where: { option: { product_id: p.id } } });
    await prisma.productOption.deleteMany({ where: { product_id: p.id } });
    await prisma.productCategory.deleteMany({ where: { product_id: p.id } });
    await prisma.product.delete({ where: { id: p.id } });
  }

  // 1. Fetch an existing standard product from the 82-product catalogue
  standardProduct = await prisma.product.findFirst({
    where: { sku: 'FM-FRM-FFC-CAMARO' },
    include: { options: { include: { values: true } } }
  });
  
  if (!standardProduct) {
    throw new Error('Standard product FM-FRM-FFC-CAMARO not found in test DB. Was db:seed run?');
  }

  // 2. Create a test-only synthetic personalized product fixture
  // Note: The real 82-product production catalogue currently contains 0 personalized products.
  // This fixture is used solely to verify the personalization integration pathways.
  testFixturePersonalizedProduct = await prisma.product.create({
    data: {
      name: 'Slice4 Custom Photo Print (TEST FIXTURE)',
      slug: 'test-slice4-custom-print',
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
    include: {
      options: { include: { values: true } }
    }
  });

  sizeOptionValue = testFixturePersonalizedProduct.options[0].values[0];
});

after(() => {
  razorpayService.createOrder = originalCreateOrder;
  razorpayService.fetchOrder = originalFetchOrder;
});

describe('Slice 4: Real Commerce Pilot', () => {

  it('Step 3: Real DB Cart Test — Standard Product', async () => {
    // Traverse: HTTP route → controller → service → Prisma → PostgreSQL
    const agent = makeAgent();
    // 1. Create session via cart fetch (agent tracks cookie)
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cartId = cartRes.body.data.id;

    // 2. Add standard product to cart
    const addRes = await agent.post('/api/v1/cart/items')
      .send({
        product_id: standardProduct.id,
        quantity: 1,
        selected_option_value_ids: [],
      });
      
    if (addRes.status !== 201) console.error('Step 3 addRes:', addRes.body);
    assert.strictEqual(addRes.status, 201);

    // Verify DB CartLineItem
    const lineItem = await prisma.cartLineItem.findFirst({ where: { cart_id: cartId } });
    assert.ok(lineItem, 'CartLineItem must be persisted');
    assert.strictEqual(lineItem.upload_id, null, 'upload_id must be null for standard');

    // 3. Checkout Initialization
    const checkoutRes = await agent.post('/api/v1/checkout/initialize')
      .send({
        customer_email: 'std@example.com',
        customer_phone: '+919999999999',
        shipping_address: validShipping,
      })
      .expect(200);

    const orderId = checkoutRes.body.data.order_id;
    assert.strictEqual(checkoutRes.body.data.amount, Number(standardProduct.base_price) * 100);
    
    // Verify Order snapshot
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });
    
    assert.ok(order, 'Order must exist');
    assert.strictEqual(Number(order!.items[0]!.unit_price), Number(standardProduct.base_price), 'Price matches DB');
    const snap = order!.items[0]!.customization_data as any;
    assert.strictEqual(snap.product_type, 'STANDARD');
    assert.strictEqual(snap.master_file_key, null);
    assert.ok(snap.packaging, 'Packaging must be preserved');
  });

  it('Step 4: Real DB Cart Test — Synthetic Personalized Fixture', async () => {
    // Traverse: HTTP route → controller → service → Prisma → PostgreSQL
    // Uses a test-only fixture since the production catalogue contains no personalized items
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cartId = cartRes.body.data.id;
    const dbCart = await prisma.cart.findUnique({ where: { id: cartId } });

    const upload = await createUploadForSession(dbCart!.session_id!);

    // Add to cart with upload
    const addRes = await agent.post('/api/v1/cart/items')
      .send({
        product_id: testFixturePersonalizedProduct.id,
        quantity: 1,
        selected_option_value_ids: [sizeOptionValue.id],
        upload_id: upload.id,
        preview_url: 'https://example.com/preview.jpg',
        crop: { x: 0, y: 0, width: 1, height: 1, aspect_ratio: '8:10' },
        orientation: 'PORTRAIT',
        rotation: 0,
        zoom: 1,
        effective_dpi: 300
      });

    if (addRes.status !== 201) console.error('Step 4 addRes:', addRes.body);
    assert.strictEqual(addRes.status, 201);

    // Verify DB linkage
    const lineItem = await prisma.cartLineItem.findFirst({ where: { cart_id: cartId } });
    assert.ok(lineItem, 'CartLineItem must be persisted');
    assert.strictEqual(lineItem.upload_id, upload.id);

    const uploadAfterCart = await prisma.userUpload.findUnique({ where: { id: upload.id } });
    assert.strictEqual(uploadAfterCart?.status, 'LINKED_TO_CART');
    assert.strictEqual(uploadAfterCart?.retention_status, 'CART_ATTACHED');

    // Checkout Initialization
    const checkoutRes = await agent.post('/api/v1/checkout/initialize')
      .send({
        customer_email: 'per@example.com',
        customer_phone: '+918888888888',
        shipping_address: validShipping,
      })
      .expect(200);

    const orderId = checkoutRes.body.data.order_id;
    
    // Verify Order snapshot
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });
    
    const snap = order!.items[0]!.customization_data as any;
    assert.strictEqual(snap.product_type, 'PERSONALIZED');
    assert.strictEqual(snap.master_file_key, upload.r2_key);
    assert.deepStrictEqual(snap.canonical_dimensions, { width: 2400, height: 3000 });
    assert.strictEqual(snap.physical_width, 8);
    assert.strictEqual(snap.physical_height, 10);
    assert.strictEqual(snap.effective_dpi, 300);
    assert.strictEqual(Number(order!.total_amount), 500);

    // Verify upload retention locked
    const uploadLocked = await prisma.userUpload.findUnique({ where: { id: upload.id } });
    assert.strictEqual(uploadLocked?.retention_status, 'CHECKOUT_LOCKED');
  });

  it('Step 5: Real DB Rejection Test — Personalized product without upload_id', async () => {
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cartId = cartRes.body.data.id;
    
    const res = await agent.post('/api/v1/cart/items')
      .send({
        product_id: testFixturePersonalizedProduct.id,
        quantity: 1,
        selected_option_value_ids: [sizeOptionValue.id],
      })
      .expect(400);

    assert.ok(res.body.error.includes('upload_id'));
    
    // Ensure no line item created
    const lineItemsCount = await prisma.cartLineItem.count({ where: { cart_id: cartId } });
    assert.strictEqual(lineItemsCount, 0);
  });

  it('Step 6: Price Authority Test', async () => {
    const agent = makeAgent();
    const cartRes = await agent.get('/api/v1/cart').expect(200);
    const cartId = cartRes.body.data.id;

    // Attempt to pass malicious price in the body
    const addRes = await agent.post('/api/v1/cart/items')
      .send({
        product_id: standardProduct.id,
        quantity: 1,
        selected_option_value_ids: [],
        base_price: 1.00, // malicious
        unit_price: 1.00, // malicious
      })
      .expect(201);

    const checkoutRes = await agent.post('/api/v1/checkout/initialize')
      .send({
        customer_email: 'auth@example.com',
        customer_phone: '+919999999999',
        shipping_address: validShipping,
      })
      .expect(200);

    // Verify the checkout price uses the backend base price (e.g. 299 * 100 paise)
    assert.strictEqual(checkoutRes.body.data.amount, Number(standardProduct.base_price) * 100);
  });

});
