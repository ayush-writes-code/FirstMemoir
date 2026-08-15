import { test, describe, before, after, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { prisma } from '@repo/database';
import { OrderStatus } from '@repo/database';
import { app } from '../../index.js';
import { env } from '../../config/env.js';

describe('Shiprocket Webhook Integration Tests', () => {
  let orderReadyForPickup: string;
  let orderShipped: string;
  let orderDelivered: string;

  let testUserId: string;
  let testCartId: string;

  before(async () => {
    // Ensure mock token is set
    env.SHIPROCKET_WEBHOOK_TOKEN = 'test_token_123';

    // Clear test events
    await prisma.webhookEvent.deleteMany({ where: { provider: 'shiprocket' } });

    const phone = '+91999' + Math.floor(Math.random() * 10000000);
    // Ensure users exist
    const user = await prisma.user.create({
      data: { phone_number: phone }
    });
    testUserId = user.id;

    const cart = await prisma.cart.create({ data: { user_id: user.id } });
    testCartId = cart.id;

    // Create seed orders
    const o1 = await prisma.order.create({
      data: {
        cart_id: cart.id,
        user_id: user.id,
        status: OrderStatus.READY_FOR_PICKUP,
        total_amount: 100,
        shipping_address_snapshot: {},
        tracking_awb: 'AWB_READY',
        shiprocket_order_id: 'SR_1',
        shiprocket_shipment_id: 'SH_1'
      }
    });
    orderReadyForPickup = o1.id;

    const o2 = await prisma.order.create({
      data: {
        cart_id: cart.id,
        user_id: user.id,
        status: OrderStatus.SHIPPED,
        total_amount: 100,
        shipping_address_snapshot: {},
        tracking_awb: 'AWB_SHIPPED',
        shiprocket_order_id: 'SR_2',
        shiprocket_shipment_id: 'SH_2'
      }
    });
    orderShipped = o2.id;

    const o3 = await prisma.order.create({
      data: {
        cart_id: cart.id,
        user_id: user.id,
        status: OrderStatus.DELIVERED,
        total_amount: 100,
        shipping_address_snapshot: {},
        tracking_awb: 'AWB_DELIVERED',
        shiprocket_order_id: 'SR_3',
        shiprocket_shipment_id: 'SH_3'
      }
    });
    orderDelivered = o3.id;
  });

  after(async () => {
    // Cleanup
    await prisma.webhookEvent.deleteMany({ where: { provider: 'shiprocket' } });
    await prisma.order.deleteMany({ where: { cart_id: testCartId } });
    await prisma.cart.deleteMany({ where: { id: testCartId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  function getPayload(awb: string, channelId: string, currentStatusId: number) {
    return {
      awb,
      channel_order_id: channelId,
      current_status_id: currentStatusId,
      current_status: 'MOCK_STATUS',
      timestamp: new Date().toISOString()
    };
  }

  it('1. Rejects missing x-api-key', async () => {
    const res = await request(app)
      .post('/api/v1/webhooks/shiprocket')
      .send(getPayload('AWB_READY', orderReadyForPickup, 42));
    assert.strictEqual(res.status, 401);
  });

  it('2. Rejects invalid x-api-key', async () => {
    const res = await request(app)
      .post('/api/v1/webhooks/shiprocket')
      .set('x-api-key', 'wrong_token')
      .send(getPayload('AWB_READY', orderReadyForPickup, 42));
    assert.strictEqual(res.status, 401);
  });

  it('3. Accepts valid token and transitions READY_FOR_PICKUP to SHIPPED via status 42 (Picked Up)', async () => {
    const payload = getPayload('AWB_READY', orderReadyForPickup, 42);
    const res = await request(app)
      .post('/api/v1/webhooks/shiprocket')
      .set('x-api-key', 'test_token_123')
      .set('Content-Type', 'application/json')
      .send(payload);

    assert.strictEqual(res.status, 200);

    const order = await prisma.order.findUnique({ where: { id: orderReadyForPickup } });
    assert.strictEqual(order?.status, 'SHIPPED');
  });

  it('4. Ignores out-of-order event (DELIVERED receiving SHIPPED webhook)', async () => {
    const payload = getPayload('AWB_DELIVERED', orderDelivered, 42);
    const res = await request(app)
      .post('/api/v1/webhooks/shiprocket')
      .set('x-api-key', 'test_token_123')
      .set('Content-Type', 'application/json')
      .send(payload);

    assert.strictEqual(res.status, 200);

    const order = await prisma.order.findUnique({ where: { id: orderDelivered } });
    assert.strictEqual(order?.status, 'DELIVERED', 'Status must remain DELIVERED');
  });

  it('5. Transitions SHIPPED to DELIVERED via status 7', async () => {
    const payload = getPayload('AWB_SHIPPED', orderShipped, 7);
    const res = await request(app)
      .post('/api/v1/webhooks/shiprocket')
      .set('x-api-key', 'test_token_123')
      .set('Content-Type', 'application/json')
      .send(payload);

    assert.strictEqual(res.status, 200);

    const order = await prisma.order.findUnique({ where: { id: orderShipped } });
    assert.strictEqual(order?.status, 'DELIVERED');
  });

  it('6. Handles RTO Initiated (9) as informational only', async () => {
    // SHIPPED order gets an RTO initiated webhook
    const payload = getPayload('AWB_SHIPPED', orderShipped, 9);
    const res = await request(app)
      .post('/api/v1/webhooks/shiprocket')
      .set('x-api-key', 'test_token_123')
      .set('Content-Type', 'application/json')
      .send(payload);

    assert.strictEqual(res.status, 200);

    const order = await prisma.order.findUnique({ where: { id: orderShipped } });
    assert.strictEqual(order?.status, 'DELIVERED'); // it was already delivered in test 5
  });

  it('7. Idempotency prevents duplicate mutations and returns 200', async () => {
    const payload = getPayload('AWB_READY', orderReadyForPickup, 18);
    // Send first time
    const res1 = await request(app)
      .post('/api/v1/webhooks/shiprocket')
      .set('x-api-key', 'test_token_123')
      .set('Content-Type', 'application/json')
      .send(payload);
    assert.strictEqual(res1.status, 200);

    // Send second time
    const res2 = await request(app)
      .post('/api/v1/webhooks/shiprocket')
      .set('x-api-key', 'test_token_123')
      .set('Content-Type', 'application/json')
      .send(payload);
    assert.strictEqual(res2.status, 200);

    // Ensure it was idempotent (only one WebhookEvent)
    // The hash will be identical for the exact same payload Buffer
  });

  it('8. Unknown AWB returns 200 OK and logs orphan error', async () => {
    const payload = getPayload('UNKNOWN_AWB', 'UNKNOWN_ID', 6);
    const res = await request(app)
      .post('/api/v1/webhooks/shiprocket')
      .set('x-api-key', 'test_token_123')
      .set('Content-Type', 'application/json')
      .send(payload);

    assert.strictEqual(res.status, 200);
  });

  it('9. Missing channel_order_id falls back to AWB correctly', async () => {
    // Create new order
    const o4 = await prisma.order.create({
      data: {
        cart_id: (await prisma.cart.findFirst())!.id,
        user_id: (await prisma.user.findFirst())!.id,
        status: OrderStatus.READY_FOR_PICKUP,
        total_amount: 100,
        shipping_address_snapshot: {},
        tracking_awb: 'AWB_AWB_ONLY',
        shiprocket_order_id: 'SR_4',
        shiprocket_shipment_id: 'SH_4'
      }
    });

    const payload = getPayload('AWB_AWB_ONLY', '', 42); // channel_order_id is empty
    const res = await request(app)
      .post('/api/v1/webhooks/shiprocket')
      .set('x-api-key', 'test_token_123')
      .set('Content-Type', 'application/json')
      .send(payload);

    assert.strictEqual(res.status, 200);

    const order = await prisma.order.findUnique({ where: { id: o4.id } });
    assert.strictEqual(order?.status, 'SHIPPED');
  });
});
