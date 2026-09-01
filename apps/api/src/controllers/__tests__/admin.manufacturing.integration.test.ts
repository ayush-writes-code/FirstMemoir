import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../index.js';
import { prisma } from '@repo/database';
import { signAccessToken } from '../../utils/jwt.js';

describe('Admin Manufacturing Queue API', () => {
  let adminToken: string;
  let customerToken: string;
  let confirmedOrderId: string;
  let processingOrderId: string;
  let pendingOrderId: string;
  let confirmedItemId: string;
  let processingItemId: string;
  let productId: string;

  before(async () => {
    // 0. Pre-cleanup
    await prisma.orderStatusHistory.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.cart.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.userUpload.deleteMany({});
    await prisma.user.deleteMany({
      where: { phone_number: { in: ['+919999999990', '+919999999991'] } }
    });

    // 1. Create users
    const adminUser = await prisma.user.create({
      data: { phone_number: '+919999999990', role: 'ADMIN' }
    });
    adminToken = signAccessToken({ userId: adminUser.id, role: adminUser.role });

    const customerUser = await prisma.user.create({
      data: { phone_number: '+919999999991', role: 'CUSTOMER' }
    });
    customerToken = signAccessToken({ userId: customerUser.id, role: customerUser.role });

    // 2. Create upload
    const upload = await prisma.userUpload.create({
      data: {
        original_filename: 'master-photo.tiff',
        r2_key: 'uploads/raw-private-key-12345.tiff',
        preview_r2_key: 'previews/preview-key-12345.webp',
        mime_type: 'image/tiff',
        file_size: 25000000
      }
    });

    // 3. Create product
    const product = await prisma.product.create({
      data: { name: 'Museum Canvas Wrap', slug: 'museum-canvas-wrap', base_price: 1500 }
    });
    productId = product.id;

    // 4. Create CONFIRMED order & item
    const cart1 = await prisma.cart.create({ data: {} });
    const order1 = await prisma.order.create({
      data: {
        user_id: customerUser.id,
        cart_id: cart1.id,
        status: 'CONFIRMED',
        total_amount: 1500,
        shipping_address_snapshot: { name: 'John Doe' }
      }
    });
    confirmedOrderId = order1.id;

    const item1 = await prisma.orderItem.create({
      data: {
        order_id: order1.id,
        product_id: product.id,
        upload_id: upload.id,
        quantity: 2,
        unit_price: 1500,
        customization_data: {
          master_file_key: 'customers/master-print-12345.tiff',
          physical_width: 24,
          physical_height: 36,
          physical_dimension_unit: 'in',
          orientation: 'PORTRAIT',
          crop_x: 0.1,
          crop_y: 0.1,
          crop_width: 0.8,
          crop_height: 0.8,
          rotation: 0,
          effective_dpi: 300,
          print_quality_status: 'EXCELLENT',
          selected_options: [
            { option_name: 'Frame', value_name: 'Natural Oak' },
            { option_name: 'Finish', value_name: 'Matte Cotton' }
          ]
        }
      }
    });
    confirmedItemId = item1.id;

    // 5. Create PROCESSING order & item
    const cart2 = await prisma.cart.create({ data: {} });
    const order2 = await prisma.order.create({
      data: {
        user_id: customerUser.id,
        cart_id: cart2.id,
        status: 'PROCESSING',
        total_amount: 1500,
        shipping_address_snapshot: { name: 'Jane Smith' }
      }
    });
    processingOrderId = order2.id;

    const item2 = await prisma.orderItem.create({
      data: {
        order_id: order2.id,
        product_id: product.id,
        upload_id: upload.id,
        quantity: 1,
        unit_price: 1500,
        customization_data: {
          master_file_key: 'customers/master-print-67890.tiff',
          physical_width: 12,
          physical_height: 18,
          physical_dimension_unit: 'in',
          orientation: 'LANDSCAPE',
          effective_dpi: 300,
          print_quality_status: 'GOOD'
        }
      }
    });
    processingItemId = item2.id;

    // 6. Create PENDING order (should NOT be in queue and download rejected)
    const cart3 = await prisma.cart.create({ data: {} });
    const order3 = await prisma.order.create({
      data: {
        user_id: customerUser.id,
        cart_id: cart3.id,
        status: 'PENDING',
        total_amount: 1500,
        shipping_address_snapshot: { name: 'Pending User' }
      }
    });
    pendingOrderId = order3.id;

    await prisma.orderItem.create({
      data: {
        order_id: order3.id,
        product_id: product.id,
        upload_id: upload.id,
        quantity: 1,
        unit_price: 1500,
        customization_data: {
          master_file_key: 'customers/master-pending.tiff'
        }
      }
    });
  });

  after(async () => {
    await prisma.orderStatusHistory.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.cart.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.userUpload.deleteMany({});
    await prisma.user.deleteMany({
      where: { phone_number: { in: ['+919999999990', '+919999999991'] } }
    });
  });

  describe('GET /api/v1/admin/manufacturing/items', () => {
    it('should reject non-admin (customer) access with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/manufacturing/items')
        .set('Cookie', [`accessToken=${customerToken}`]);
      assert.strictEqual(res.status, 403);
    });

    it('should reject unauthenticated access with 401', async () => {
      const res = await request(app).get('/api/v1/admin/manufacturing/items');
      assert.strictEqual(res.status, 401);
    });

    it('should return item-centric queue for admin with CONFIRMED and PROCESSING items', async () => {
      const res = await request(app)
        .get('/api/v1/admin/manufacturing/items')
        .set('Cookie', [`accessToken=${adminToken}`]);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(Array.isArray(res.body.data), true);
      
      const confirmedItem = res.body.data.find((i: any) => i.id === confirmedItemId);
      assert.ok(confirmedItem, 'Confirmed item should be in queue');
      assert.strictEqual(confirmedItem.order.status, 'CONFIRMED');
      assert.strictEqual(confirmedItem.quantity, 2);

      const processingItem = res.body.data.find((i: any) => i.id === processingItemId);
      assert.ok(processingItem, 'Processing item should be in queue');
      assert.strictEqual(processingItem.order.status, 'PROCESSING');

      // Ensure PENDING items are NOT in queue
      const pendingItems = res.body.data.filter((i: any) => i.order.status === 'PENDING');
      assert.strictEqual(pendingItems.length, 0, 'Pending items must not appear in queue');
    });

    it('should extract specifications strictly from OrderItem snapshot', async () => {
      const res = await request(app)
        .get('/api/v1/admin/manufacturing/items')
        .set('Cookie', [`accessToken=${adminToken}`]);
      
      const item = res.body.data.find((i: any) => i.id === confirmedItemId);
      assert.strictEqual(item.snapshot.physical_width, 24);
      assert.strictEqual(item.snapshot.physical_height, 36);
      assert.strictEqual(item.snapshot.physical_dimension_unit, 'in');
      assert.strictEqual(item.snapshot.orientation, 'PORTRAIT');
      assert.strictEqual(item.snapshot.effective_dpi, 300);
      assert.strictEqual(item.snapshot.print_quality_status, 'EXCELLENT');
      assert.strictEqual(item.snapshot.options.length, 2);
    });

    it('should never expose raw R2 keys or master_file_key in the queue response', async () => {
      const res = await request(app)
        .get('/api/v1/admin/manufacturing/items')
        .set('Cookie', [`accessToken=${adminToken}`]);
      
      const item = res.body.data.find((i: any) => i.id === confirmedItemId);
      assert.strictEqual(item.master_file_key, undefined);
      assert.strictEqual(item.r2_key, undefined);
      assert.strictEqual(item.snapshot.master_file_key, undefined);
      assert.strictEqual(item.snapshot.has_master_file, true);
    });

    it('should preserve snapshot specs even if live Product catalog changes', async () => {
      // Modify live product table
      await prisma.product.update({
        where: { id: productId },
        data: { name: 'Renamed Product Title', base_price: 9999 }
      });

      const res = await request(app)
        .get('/api/v1/admin/manufacturing/items')
        .set('Cookie', [`accessToken=${adminToken}`]);
      
      const item = res.body.data.find((i: any) => i.id === confirmedItemId);
      // Manufacturing specs remain unchanged
      assert.strictEqual(item.snapshot.physical_width, 24);
      assert.strictEqual(item.snapshot.physical_height, 36);
      assert.strictEqual(item.snapshot.effective_dpi, 300);
    });
  });

  describe('GET /api/v1/admin/orders/:id/items/:itemId/download-asset', () => {
    it('should reject non-admin (customer) access with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/orders/${confirmedOrderId}/items/${confirmedItemId}/download-asset`)
        .set('Cookie', [`accessToken=${customerToken}`]);
      assert.strictEqual(res.status, 403);
    });

    it('should reject unauthenticated access with 401', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/orders/${confirmedOrderId}/items/${confirmedItemId}/download-asset`);
      assert.strictEqual(res.status, 401);
    });

    it('should generate temporary presigned download url for admin', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/orders/${confirmedOrderId}/items/${confirmedItemId}/download-asset`)
        .set('Cookie', [`accessToken=${adminToken}`]);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.url);
      assert.ok(res.body.data.url.includes('X-Amz-Signature') || res.body.data.url.includes('X-Amz-Algorithm'));
      
      // Ensure master_file_key is not returned as a plain field
      assert.strictEqual(res.body.data.master_file_key, undefined);
    });

    it('should reject download for PENDING orders with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/orders/${pendingOrderId}/items/any-id/download-asset`)
        .set('Cookie', [`accessToken=${adminToken}`]);
      assert.strictEqual(res.status, 403);
    });

    it('should return 404 for invalid order ID', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/orders/00000000-0000-0000-0000-000000000000/items/${confirmedItemId}/download-asset`)
        .set('Cookie', [`accessToken=${adminToken}`]);
      assert.strictEqual(res.status, 404);
    });

    it('should return 404 for invalid item ID in an existing order', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/orders/${confirmedOrderId}/items/00000000-0000-0000-0000-000000000000/download-asset`)
        .set('Cookie', [`accessToken=${adminToken}`]);
      assert.strictEqual(res.status, 404);
    });
  });
});
