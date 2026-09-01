import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../index.js';
import { prisma } from '@repo/database';

import { signAccessToken } from '../../utils/jwt.js';

describe('Catalog Contract Stabilization Integration Tests', () => {
  let adminToken: string;
  
  before(async () => {
    await prisma.user.deleteMany({ where: { phone_number: 'admin12345' } });
    
    const adminUser = await prisma.user.create({
      data: {
        phone_number: 'admin12345',
        role: 'ADMIN',
        first_name: 'Test',
      }
    });
    adminToken = signAccessToken({ userId: adminUser.id, role: 'ADMIN' });
    
    // Setup test data
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.cartLineItem.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.product.deleteMany({});
    
    const rootCat = await prisma.category.create({
      data: {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Root Category',
        slug: 'root-category',
        is_active: true,
        sort_order: 1
      }
    });

    const childCat = await prisma.category.create({
      data: {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Child Category',
        slug: 'child-category',
        is_active: false, // inactive to test filtering
        sort_order: 2,
        parent_id: rootCat.id
      }
    });

    await prisma.product.create({
      data: {
        id: 'prod-1',
        name: 'Test Product 1',
        slug: 'test-product-1',
        base_price: 100,
        is_active: true,
        categories: {
          create: [{ category_id: '11111111-1111-1111-1111-111111111111' }]
        }
      }
    });
    
    await prisma.product.create({
      data: {
        id: 'prod-2',
        name: 'Test Product 2',
        slug: 'test-product-2',
        base_price: 200,
        is_active: true,
        categories: {
          create: [{ category_id: '11111111-1111-1111-1111-111111111111' }]
        }
      }
    });
  });

  after(async () => {
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.cartLineItem.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
  });

  describe('GET /api/v1/products', () => {
    it('should return a paginated response envelope with DTOs and meta data', async () => {
      const res = await request(app).get('/api/v1/products?limit=1').expect(200);
      
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.strictEqual(res.body.data.length, 1);
      
      const product = res.body.data[0];
      assert.ok(product.id);
      assert.ok(product.name);
      
      assert.ok(res.body.meta);
      assert.strictEqual(res.body.meta.total, 2);
      assert.strictEqual(res.body.meta.page, 1);
      assert.strictEqual(res.body.meta.limit, 1);
      assert.strictEqual(res.body.meta.totalPages, 2);
    });
  });

  describe('GET /api/v1/categories', () => {
    it('should return all categories for admin (no active filter)', async () => {
      const res = await request(app).get('/api/v1/categories').expect(200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.length, 2);
    });

    it('should return only active categories when active=true is provided', async () => {
      const res = await request(app).get('/api/v1/categories?active=true').expect(200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.length, 1);
      assert.strictEqual(res.body.data[0].slug, 'root-category');
    });
  });

  describe('GET /api/v1/categories/tree', () => {
    it('should construct and return the category tree correctly', async () => {
      const res = await request(app).get('/api/v1/categories/tree').expect(200);
      assert.strictEqual(res.body.success, true);
      
      const tree = res.body.data;
      assert.ok(Array.isArray(tree));
      const root = tree.find((c: any) => c.id === '11111111-1111-1111-1111-111111111111');
      assert.ok(root);
      
      assert.strictEqual(root.children.length, 1);
      assert.strictEqual(root.children[0].id, '22222222-2222-2222-2222-222222222222');
    });
  });

  describe('Product SKU Support', () => {
    it('should allow creating a product with a SKU and return it', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          name: 'Test Product with SKU',
          sku: 'SKU-TEST-001',
          base_price: '150.00',
          category_ids: ['11111111-1111-1111-1111-111111111111'],
        })
        .expect(201);
      
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.sku, 'SKU-TEST-001');

      // Verify it persists in DB
      const dbProduct = await prisma.product.findUnique({ where: { id: res.body.data.id } });
      assert.strictEqual(dbProduct?.sku, 'SKU-TEST-001');
    });

    it('should return SKU in GET /api/v1/products', async () => {
      const res = await request(app).get('/api/v1/products?limit=10').expect(200);
      const skuProduct = res.body.data.find((p: any) => p.name === 'Test Product with SKU');
      assert.ok(skuProduct);
      assert.strictEqual(skuProduct.sku, 'SKU-TEST-001');
    });
  });
});
