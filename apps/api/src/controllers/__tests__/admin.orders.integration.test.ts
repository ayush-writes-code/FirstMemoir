import { assertTestDatabaseSafe } from "../../utils/test-safety.js";

import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../index.js';
import { prisma } from '@repo/database';
import { signAccessToken } from '../../utils/jwt.js';
import { shiprocketService } from '../../services/shiprocket.service.js';

describe('Admin Orders Integration', () => {
  let adminToken: string;
  let userToken: string;
  let testOrderId: string;

  before(async () => {
    assertTestDatabaseSafe();
    process.env.SHIPROCKET_DRY_RUN = 'true';
    
    // We intentionally DO NOT mock calculateFulfillmentMetrics here.
    // The business rule is undefined, so it will throw.
    // 0. Clean up any leftover users from previous crashed runs
    await prisma.orderItem.deleteMany();
    await prisma.user.deleteMany({ where: { phone_number: { in: ['1234567890', '0987654321'] } } });
    await prisma.product.deleteMany({ where: { slug: 'test-canvas-admin' } });
    await prisma.userUpload.deleteMany({ where: { r2_key: { startsWith: 'test/test' } } });

    // 1. Create a guest user (no role) and an admin user
    const guestUser = await prisma.user.create({
      data: { phone_number: '1234567890', first_name: 'Guest User', role: 'CUSTOMER' }
    });
    const adminUser = await prisma.user.create({
      data: { phone_number: '0987654321', first_name: 'Admin User', role: 'ADMIN' }
    });

    userToken = signAccessToken({ userId: guestUser.id, role: 'CUSTOMER' });
    adminToken = signAccessToken({ userId: adminUser.id, role: 'ADMIN' });

    // 2. Create a test product with SKU
    const product = await prisma.product.create({
      data: {
        name: 'Test Canvas',
        slug: 'test-canvas-admin',
        sku: 'CAN-123',
        base_price: 1000,
        is_active: true
      }
    });

    // 3. Create a cart first
    const cart = await prisma.cart.create({
      data: {
        session_id: `test-admin-session-${Date.now()}`,
      }
    });

    const r2Key1 = `test/test-${Date.now()}-1.jpg`;
    const upload = await prisma.userUpload.create({
      data: {
        session_id: cart.session_id,
        original_filename: 'test.jpg',
        r2_key: r2Key1,
        file_size: 100,
        mime_type: 'image/jpeg',
        status: 'READY',
        retention_status: 'ORDERED_RETAINED',
      }
    });

    // 5. Create a CONFIRMED order with complete fulfillment data
    const order = await prisma.order.create({
      data: {
        cart_id: cart.id,
        total_amount: 1000,
        status: 'CONFIRMED',
        customer_email: 'test@example.com',
        customer_phone: '1234567890',
        shipping_address_snapshot: {
          name: 'Test Customer',
          line1: '123 Test St',
          city: 'Test City',
          state: 'MH',
          postal_code: '400001',
          country: 'India'
        },
        items: {
          create: [{
            product_id: product.id,
            upload_id: upload.id,
            quantity: 1,
            unit_price: 1000,
            customization_data: {
              physical_width: 8,
              physical_height: 10,
              physical_dimension_unit: 'in',
              master_file_key: r2Key1,
              selected_options: [{
                option_name: 'Size',
                value_name: '8x10',
                value_metadata: {
                  width: 8,
                  height: 10
                }
              }]
            }
          }]
        }
      }
    });

    testOrderId = order.id;
  });

  after(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartLineItem.deleteMany();
    await prisma.cart.deleteMany({ where: { session_id: { startsWith: 'test-admin-session' } } });
    await prisma.userUpload.deleteMany({ where: { session_id: { startsWith: 'test-admin-session' } } });
    await prisma.product.deleteMany({ where: { slug: 'test-canvas-admin' } });
    await prisma.user.deleteMany({ where: { phone_number: { in: ['1234567890', '0987654321'] } } });
    await prisma.$disconnect();
    
    process.env.SHIPROCKET_DRY_RUN = undefined;
    mock.restoreAll();
  });

  it('A. Admin authorization - non-admin -> 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/orders')
      .set('Cookie', [`access_token=${userToken}`]);
    assert.strictEqual(res.status, 403);
  });

  it('A. Admin authorization - admin -> success', async () => {
    const res = await request(app)
      .get('/api/v1/admin/orders')
      .set('Cookie', [`access_token=${adminToken}`]);
    assert.strictEqual(res.status, 200);
  });

  it('B. Order list returns expected orders', async () => {
    const res = await request(app)
      .get('/api/v1/admin/orders')
      .set('Cookie', [`access_token=${adminToken}`]);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.orders.length > 0);
    assert.ok(res.body.data.orders.some((o: any) => o.id === testOrderId));
  });

  it('C. Order detail returns immutable snapshots and complete fulfillment data', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/orders/${testOrderId}`)
      .set('Cookie', [`access_token=${adminToken}`]);
    
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.order.id, testOrderId);
    assert.strictEqual(res.body.data.fulfillmentDataComplete, true);
    assert.strictEqual(res.body.data.missingFields.length, 0);
  });

  it('F. CONFIRMED -> PROCESSING success (with NO shipping package metrics)', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/orders/${testOrderId}/process`)
      .set('Cookie', [`access_token=${adminToken}`]);
    
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'PROCESSING');
  });

  it('G. PROCESSING -> PROCESSING rejected (formerly PENDING check)', async () => {
    // Order is now PROCESSING, we can't process it again
    const res = await request(app)
      .post(`/api/v1/admin/orders/${testOrderId}/process`)
      .set('Cookie', [`access_token=${adminToken}`]);
    
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('Cannot process order with status PROCESSING'));
  });

  it('D. Missing fulfillment data returns incomplete', async () => {
    // Create incomplete order
    const incompleteCart = await prisma.cart.create({
      data: { session_id: `test-admin-session-inc-${Date.now()}` }
    });

    const r2Key2 = `test/test-${Date.now()}-2.jpg`;
    const incompleteUpload = await prisma.userUpload.create({
      data: {
        session_id: incompleteCart.session_id,
        original_filename: 'test2.jpg',
        r2_key: r2Key2,
        file_size: 100,
        mime_type: 'image/jpeg',
        status: 'READY',
        retention_status: 'ORDERED_RETAINED',
      }
    });
    
    const incompleteOrder = await prisma.order.create({
      data: {
        cart_id: incompleteCart.id,
        total_amount: 1000,
        status: 'CONFIRMED',
        customer_email: 'test@example.com',
        customer_phone: '1234567890',
        shipping_address_snapshot: {
          line1: '123 Test St', // missing name, city, state, postal code
        }
      }
    });

    const res = await request(app)
      .get(`/api/v1/admin/orders/${incompleteOrder.id}`)
      .set('Cookie', [`access_token=${adminToken}`]);
    
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.fulfillmentDataComplete, false);
    assert.ok(res.body.data.missingFields.length > 0);
    assert.ok(res.body.data.missingFields.includes('shipping_address_snapshot'));
  });


  it('I. PROCESSING -> Generate AWB fails safely with undefined packaging metrics', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/orders/${testOrderId}/shiprocket/awb`)
      .set('Cookie', [`access_token=${adminToken}`]);
    
    assert.strictEqual(res.status, 500);
    assert.ok(res.body.error.includes('PACKAGE_FULFILLMENT_METRICS_UNDEFINED'));
    
    // Order should remain PROCESSING
    const order = await prisma.order.findUnique({ where: { id: testOrderId } });
    assert.strictEqual(order?.status, 'PROCESSING');
  });

  it('J. Generate AWB success with mocked valid fulfillment metrics', async () => {
    // Mock the metrics only for this successful generation
    mock.method(shiprocketService, 'calculateFulfillmentMetrics', () => ({ length: 20, width: 20, height: 20, weight_kg: 1 }));

    const res = await request(app)
      .post(`/api/v1/admin/orders/${testOrderId}/shiprocket/awb`)
      .set('Cookie', [`access_token=${adminToken}`]);
    
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'READY_FOR_PICKUP');
    assert.strictEqual(res.body.data.shiprocket_order_id, `mock_ord_${testOrderId}`);
    assert.strictEqual(res.body.data.shiprocket_shipment_id, `mock_ship_${testOrderId}`);
    assert.strictEqual(res.body.data.tracking_awb, `MOCK-AWB-${testOrderId}`);
    
    mock.restoreAll();
  });
});
