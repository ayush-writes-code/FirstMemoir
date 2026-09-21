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

  describe('Product and Option Metadata Validation & Persistence', () => {
    let testProductId: string;
    let testOptionId: string;
    let testOptionValueId: string;

    it('1. should allow creating product with valid 3-layer mockup metadata', async () => {
      const validMockup = {
        mockups: {
          portrait: {
            printArea: { top: '20.53%', left: '39.25%', width: '21.30%', height: '41.80%' },
            baseAsset: '/mockups/test/scene.webp',
            overlayAsset: '/mockups/test/frame.png'
          }
        }
      };

      const res = await request(app)
        .post('/api/v1/products')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          name: 'Product With Mockup',
          base_price: '500.00',
          category_ids: ['11111111-1111-1111-1111-111111111111'],
          mockup_metadata: validMockup,
          manufacturing_metadata: { printer_code: 'TEST_01' }
        })
        .expect(201);

      assert.strictEqual(res.body.success, true);
      assert.deepStrictEqual(res.body.data.mockup_metadata, validMockup);
      assert.deepStrictEqual(res.body.data.manufacturing_metadata, { printer_code: 'TEST_01' });
      testProductId = res.body.data.id;
    });

    it('2. should reject malformed mockup metadata missing coordinates and mockups', async () => {
      await request(app)
        .post('/api/v1/products')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          name: 'Invalid Mockup Product',
          base_price: '500.00',
          category_ids: ['11111111-1111-1111-1111-111111111111'],
          mockup_metadata: { foo: 'bar' }
        })
        .expect(400);
    });

    it('3. should reject invalid coordinate values (not percentages)', async () => {
      await request(app)
        .post('/api/v1/products')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          name: 'Invalid Coords Product',
          base_price: '500.00',
          category_ids: ['11111111-1111-1111-1111-111111111111'],
          mockup_metadata: {
            coordinates: {
              '0': { top: '20px', left: '20%', width: '60%', height: '60%' }
            }
          }
        })
        .expect(400);
    });

    it('4. should reject invalid orientation keys in mockups', async () => {
      await request(app)
        .post('/api/v1/products')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          name: 'Invalid Orient Product',
          base_price: '500.00',
          category_ids: ['11111111-1111-1111-1111-111111111111'],
          mockup_metadata: {
            mockups: {
              diagonal: {
                printArea: { top: '20%', left: '20%', width: '60%', height: '60%' },
                baseAsset: '/test.webp',
                overlayAsset: '/overlay.png'
              }
            }
          }
        })
        .expect(400);
    });

    it('5. should allow updating product metadata via PUT', async () => {
      const updatedMockup = {
        coordinates: {
          '0': { top: '25%', left: '30%', width: '40%', height: '50%' }
        }
      };

      const res = await request(app)
        .put(`/api/v1/products/${testProductId}`)
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          name: 'Product With Mockup Updated',
          base_price: '550.00',
          category_ids: ['11111111-1111-1111-1111-111111111111'],
          mockup_metadata: updatedMockup,
          manufacturing_metadata: { printer_code: 'TEST_02', bleed_mm: 3 }
        })
        .expect(200);

      assert.strictEqual(res.body.success, true);
      assert.deepStrictEqual(res.body.data.mockup_metadata, updatedMockup);
      assert.deepStrictEqual(res.body.data.manufacturing_metadata, { printer_code: 'TEST_02', bleed_mm: 3 });
    });

    it('6. should allow creating product option and option value with valid metadata', async () => {
      // Create option
      const optRes = await request(app)
        .post(`/api/v1/products/${testProductId}/options`)
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          name: 'Size',
          input_type: 'RADIO',
          is_required: true
        })
        .expect(201);
      
      testOptionId = optRes.body.data.id;

      // Create option value with metadata
      const valRes = await request(app)
        .post(`/api/v1/products/${testProductId}/options/${testOptionId}/values`)
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          value: '12x18',
          price_modifier: 400,
          modifier_type: 'FLAT',
          metadata: {
            width: 12,
            height: 18,
            unit: 'in',
            packaging: { length: 20, width: 14, height: 2, weight: 1.2 }
          }
        })
        .expect(201);

      assert.strictEqual(valRes.body.success, true);
      assert.strictEqual(valRes.body.data.value, '12x18');
      assert.deepStrictEqual(valRes.body.data.metadata, {
        width: 12,
        height: 18,
        unit: 'in',
        packaging: { length: 20, width: 14, height: 2, weight: 1.2 }
      });
      testOptionValueId = valRes.body.data.id;
    });

    it('7. should reject option value with malformed metadata (negative dimensions)', async () => {
      await request(app)
        .post(`/api/v1/products/${testProductId}/options/${testOptionId}/values`)
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          value: 'Invalid Option Value',
          metadata: {
            width: -10,
            packaging: { length: -5, width: 10, height: 2, weight: 1 }
          }
        })
        .expect(400);
    });

    it('8. should allow updating option value metadata via PUT', async () => {
      const updatedMeta = {
        width: 16,
        height: 20,
        unit: 'in',
        packaging: { length: 22, width: 18, height: 3, weight: 1.8 }
      };

      const res = await request(app)
        .put(`/api/v1/products/${testProductId}/options/${testOptionId}/values/${testOptionValueId}`)
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          value: '16x20',
          price_modifier: 600,
          metadata: updatedMeta
        })
        .expect(200);

      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.value, '16x20');
      assert.deepStrictEqual(res.body.data.metadata, updatedMeta);
    });

    it('9. should persist and refetch option value metadata and product metadata on GET /:id', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${testProductId}`)
        .expect(200);

      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.mockup_metadata);
      assert.strictEqual(res.body.data.manufacturing_metadata.printer_code, 'TEST_02');

      const sizeOption = res.body.data.options.find((o: any) => o.name === 'Size');
      assert.ok(sizeOption);
      const val = sizeOption.values.find((v: any) => v.id === testOptionValueId);
      assert.ok(val);
      assert.strictEqual(val.metadata.width, 16);
      assert.strictEqual(val.metadata.packaging.weight, 1.8);
    });
  });
});
