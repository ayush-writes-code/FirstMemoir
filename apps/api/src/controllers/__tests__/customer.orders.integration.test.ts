import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../index.js';
import { prisma } from '@repo/database';
import { signAccessToken } from '../../utils/jwt.js';

describe('Customer Orders Integration API', () => {
  let customerToken: string;
  let customerUserId: string;
  let testOrderId: string;

  before(async () => {
    // 0. Pre-cleanup
    await prisma.orderStatusHistory.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.cart.deleteMany({});
    await prisma.user.deleteMany({
      where: { phone_number: { in: ['+919999999999', '+919999999998'] } }
    });

    // 1. Create a customer user
    const user = await prisma.user.create({
      data: {
        phone_number: '+919999999999',
        first_name: 'Test',
        last_name: 'Customer',
        role: 'CUSTOMER'
      }
    });
    customerUserId = user.id;

    // 2. Generate a token
    customerToken = signAccessToken({ userId: user.id, role: user.role });

    // 3. Create a cart and order
    const cart = await prisma.cart.create({
      data: { session_id: 'test-session' }
    });

    const order = await prisma.order.create({
      data: {
        user_id: user.id,
        cart_id: cart.id,
        session_id: 'test-session',
        status: 'PENDING',
        total_amount: 1000,
        customer_email: 'test@example.com',
        customer_phone: '+919999999999',
        shipping_address_snapshot: { name: 'Test', city: 'Test' }
      }
    });
    testOrderId = order.id;
  });

  after(async () => {
    // Cleanup
    await prisma.orderStatusHistory.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.cart.deleteMany({});
    await prisma.user.deleteMany({
      where: { phone_number: { in: ['+919999999999', '+919999999998'] } }
    });
  });

  describe('GET /api/v1/orders/my-orders', () => {
    it('should return paginated orders for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/orders/my-orders')
        .set('Cookie', [`accessToken=${customerToken}`]);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(Array.isArray(res.body.data.orders), true);
      assert.strictEqual(res.body.data.orders.length >= 1, true);
      assert.strictEqual(res.body.data.orders[0].id, testOrderId);
      
      // Ensure private data is not leaked
      assert.strictEqual(res.body.data.orders[0].shipping_address_snapshot, undefined);
    });

    it('should reject unauthenticated access', async () => {
      const res = await request(app).get('/api/v1/orders/my-orders');
      assert.strictEqual(res.status, 401);
    });
  });

  describe('GET /api/v1/orders/:id', () => {
    it('should return order details for the owner', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${testOrderId}`)
        .set('Cookie', [`accessToken=${customerToken}`]);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.id, testOrderId);
      assert.notStrictEqual(res.body.data.shipping_address, undefined);
      
      // Ensure master keys aren't exposed
      assert.strictEqual(res.body.data.master_file_key, undefined);
    });

    it('should return 404 for an order not belonging to the customer', async () => {
      // Create another customer
      const user2 = await prisma.user.create({
        data: { phone_number: '+919999999998', role: 'CUSTOMER' }
      });
      const token2 = signAccessToken({ userId: user2.id, role: user2.role });

      const res = await request(app)
        .get(`/api/v1/orders/${testOrderId}`)
        .set('Cookie', [`accessToken=${token2}`]);
      
      assert.strictEqual(res.status, 404); // Disguised as 404
    });
  });

  describe('POST /api/v1/orders/track', () => {
    it('should return guest tracking info for valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/orders/track')
        .send({
          order_id: testOrderId,
          phone_number: '+919999999999'
        });
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.id, testOrderId);
      
      // Ensure it's masked (no address)
      assert.strictEqual(res.body.data.shipping_address, undefined);
      assert.strictEqual(res.body.data.notes, undefined);
    });

    it('should reject invalid phone number with 404', async () => {
      const res = await request(app)
        .post('/api/v1/orders/track')
        .send({
          order_id: testOrderId,
          phone_number: '+910000000000'
        });
      
      assert.strictEqual(res.status, 404);
    });
  });
});
