import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../index.js';
import { prisma } from '@repo/database';
import { razorpayService } from '../../services/razorpay.service.js';
import { assertTestDatabaseSafe } from '../../utils/test-safety.js';
import { signAccessToken } from '../../utils/jwt.js';

// Mock Razorpay SDK creation
const originalCreateOrder = razorpayService.createOrder;
const originalFetchOrder = razorpayService.fetchOrder;

let standardProduct: any;
let testOrderId: string;
let adminToken: string;
let customerToken: string;

const validShipping = {
  name: 'Test Admin Buyer',
  line1: '123 Admin Street',
  city: 'Bengaluru',
  state: 'Karnataka',
  postal_code: '560001',
  country: 'IN',
};

function makeAgent() {
  return request.agent(app);
}

before(async () => {
  assertTestDatabaseSafe();

  razorpayService.createOrder = async (amount: number, receipt: string) => {
    return {
      id: `rzp_test_admin_order_${Date.now()}`,
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

  // Clean test data
  const slice5Carts = await prisma.cart.findMany({ where: { session_id: { startsWith: 'slice5-' } } });
  const slice5CartIds = slice5Carts.map(c => c.id);
  const slice5Orders = await prisma.order.findMany({ where: { cart_id: { in: slice5CartIds } } });
  const slice5OrderIds = slice5Orders.map(o => o.id);

  await prisma.orderItem.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartLineItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.user.deleteMany({ where: { phone_number: { startsWith: '+91999999955' } } });
  
  // Clean up any test fixtures from previous tests to ensure exactly 82 products
  const testsFixtures = await prisma.product.findMany({ where: { sku: { startsWith: 'TEST-CST-POS' } } });
  for (const p of testsFixtures) {
    await prisma.productOptionValue.deleteMany({ where: { option: { product_id: p.id } } });
    await prisma.productOption.deleteMany({ where: { product_id: p.id } });
    await prisma.productCategory.deleteMany({ where: { product_id: p.id } });
    await prisma.product.delete({ where: { id: p.id } });
  }

  const adminUser = await prisma.user.create({
    data: { phone_number: '+919999999551', first_name: 'Admin', role: 'ADMIN' }
  });
  const customerUser = await prisma.user.create({
    data: { phone_number: '+919999999552', first_name: 'Customer', role: 'CUSTOMER' }
  });

  adminToken = signAccessToken({ userId: adminUser.id, role: 'ADMIN' });
  customerToken = signAccessToken({ userId: customerUser.id, role: 'CUSTOMER' });

  // 1. Fetch an existing standard product from the 82-product catalogue
  standardProduct = await prisma.product.findFirst({
    where: { sku: 'FM-FRM-POR-GT3' },
    include: { options: { include: { values: true } } }
  });
  
  if (!standardProduct) {
    throw new Error('Standard product FM-FRM-POR-GT3 not found in test DB.');
  }

  // 2. Create the real order using checkout flow (so we test the exact DB path)
  const agent = makeAgent();
  const cartRes = await agent.get('/api/v1/cart').expect(200);
  
  await agent.post('/api/v1/cart/items')
    .send({
      product_id: standardProduct.id,
      quantity: 2,
      selected_option_value_ids: [],
    })
    .expect(201);

  const checkoutRes = await agent.post('/api/v1/checkout/initialize')
    .send({
      customer_email: 'admin.verify@example.com',
      customer_phone: '+919999999555',
      shipping_address: validShipping,
    })
    .expect(200);

  testOrderId = checkoutRes.body.data.order_id;
  
  // Transition order to CONFIRMED for manufacturing queue visibility
  await prisma.order.update({
    where: { id: testOrderId },
    data: { status: 'CONFIRMED' }
  });
});

after(() => {
  razorpayService.createOrder = originalCreateOrder;
});

describe('Slice 5: Admin Verification', () => {

  it('1. Security/Auth Verification: Unauthorized access rejected', async () => {
    const res = await request(app)
      .get('/api/v1/admin/orders')
      .set('Cookie', [`access_token=${customerToken}`]);
    assert.strictEqual(res.status, 403);
  });

  it('2. Catalogue Verification: Lists exactly 82 products and exposes provisional state', async () => {
    // Admin uses standard /api/v1/products for listing
    // Max limit is 50, so fetch two pages
    const res1 = await request(app).get('/api/v1/products?limit=50&page=1');
    const res2 = await request(app).get('/api/v1/products?limit=50&page=2');
    
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res2.status, 200);
    
    const products = [...res1.body.data, ...res2.body.data];
    assert.strictEqual(products.length, 82);

    // Verify some are provisional, some are not
    const provisionalCount = products.filter((p: any) => p.manufacturing_metadata?.provisional_price === true).length;
    const confirmedCount = products.filter((p: any) => p.manufacturing_metadata?.provisional_price === false).length;
    
    assert.strictEqual(provisionalCount, 34);
    assert.strictEqual(confirmedCount, 48);

    // Verify product has SKU, slug, price, category
    const product = products.find((p: any) => p.id === standardProduct.id);
    assert.strictEqual(product.sku, 'FM-FRM-POR-GT3');
    assert.ok(product.slug);
    assert.ok(product.base_price);
    assert.ok(product.categories.length > 0);
  });

  it('3. Order List Verification: Exposes order details correctly to admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/orders')
      .set('Cookie', [`access_token=${adminToken}`]);
      
    assert.strictEqual(res.status, 200);
    const order = res.body.data.orders.find((o: any) => o.id === testOrderId);
    assert.ok(order);
    assert.strictEqual(order.status, 'CONFIRMED');
    assert.strictEqual(order.total_amount, (Number(standardProduct.base_price) * 2).toString()); // amount is in Rupees
    assert.ok(order.customer_email);
  });

  it('4. Order Detail Verification: Exposes order items and product identity', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/orders/${testOrderId}`)
      .set('Cookie', [`access_token=${adminToken}`]);
      
    assert.strictEqual(res.status, 200);
    const order = res.body.data.order;
    assert.strictEqual(order.id, testOrderId);
    assert.strictEqual(order.items.length, 1);
    
    const item = order.items[0];
    assert.strictEqual(item.quantity, 2);
    assert.strictEqual(item.unit_price, standardProduct.base_price.toString());
    assert.strictEqual(item.product.sku, 'FM-FRM-POR-GT3');
    
    const snap = item.customization_data;
    assert.strictEqual(snap.product_type, 'STANDARD');
  });

  it('5. Manufacturing Queue Verification: Exposes order item correctly', async () => {
    const res = await request(app)
      .get('/api/v1/admin/manufacturing/items')
      .set('Cookie', [`access_token=${adminToken}`]);
      
    assert.strictEqual(res.status, 200);
    const queueItem = res.body.data.find((i: any) => i.order.id === testOrderId);
    assert.ok(queueItem, 'Order item must appear in manufacturing queue');
    assert.strictEqual(queueItem.product_name, standardProduct.name);
    assert.strictEqual(queueItem.quantity, 2);
    assert.strictEqual(queueItem.snapshot.has_master_file, false); // Standard product
  });

});
