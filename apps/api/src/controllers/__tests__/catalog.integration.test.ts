import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../index.js';
import { prisma } from '@repo/database';

describe('Catalog Contract Stabilization Integration Tests', () => {
  
  before(async () => {
    // Setup test data
    await prisma.category.deleteMany({});
    await prisma.product.deleteMany({});
    
    const rootCat = await prisma.category.create({
      data: {
        id: 'cat-root-1',
        name: 'Root Category',
        slug: 'root-category',
        is_active: true,
        sort_order: 1
      }
    });

    const childCat = await prisma.category.create({
      data: {
        id: 'cat-child-1',
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
          create: [{ category_id: rootCat.id }]
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
          create: [{ category_id: rootCat.id }]
        }
      }
    });
  });

  after(async () => {
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
      const root = tree.find((c: any) => c.id === 'cat-root-1');
      assert.ok(root);
      
      assert.strictEqual(root.children.length, 1);
      assert.strictEqual(root.children[0].id, 'cat-child-1');
    });
  });
});
