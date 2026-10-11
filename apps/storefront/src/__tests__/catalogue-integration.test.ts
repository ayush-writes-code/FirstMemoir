import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { adaptApiProductToStorefront, type StorefrontProduct } from '../types.js';
import { products as productsApi, categories as categoriesApi } from '../lib/api-client.js';
import type { ProductDto } from '@repo/api-client';

describe('Slice 6C.5: Storefront Catalogue Integration & Contract Tests', () => {

  describe('1. Storefront Product Adapter Unit Tests', () => {
    it('should correctly map complete API ProductDto to StorefrontProduct', () => {
      const mockApiProduct: ProductDto = {
        id: 'prod-uuid-1',
        name: 'Cristiano Ronaldo Wall Frame',
        slug: 'cristiano-ronaldo-wall-frame',
        sku: 'FM-FRM-CR7',
        description: 'Premium framed print on 300 GSM photographic paper.',
        base_price: '299',
        is_active: true,
        created_at: '2026-10-09T10:33:13.000Z',
        updated_at: '2026-10-09T10:34:18.000Z',
        manufacturing_metadata: {
          provisional_price: true,
          pricing_status: 'PROVISIONAL_ESTIMATE',
        },
        images: [
          {
            id: 'img-1',
            file_key: '/catalog/frames/football-ronaldo-1.jpg',
            url: 'https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev//catalog/frames/football-ronaldo-1.jpg',
            alt_text: 'Cristiano Ronaldo Frame',
            sort_order: 0,
          },
        ],
        categories: [
          {
            category: {
              id: 'cat-frames-id',
              name: 'Wall Frames',
              slug: 'frames',
              description: '8x12 inch Framed Prints',
              is_active: true,
              sort_order: 0,
              created_at: '2026-10-09T10:32:19.000Z',
            },
          },
        ],
      };

      const storefrontProduct: StorefrontProduct = adaptApiProductToStorefront(mockApiProduct);

      assert.equal(storefrontProduct.id, 'prod-uuid-1');
      assert.equal(storefrontProduct.name, 'Cristiano Ronaldo Wall Frame');
      assert.equal(storefrontProduct.slug, 'cristiano-ronaldo-wall-frame');
      assert.equal(storefrontProduct.sku, 'FM-FRM-CR7');
      assert.equal(storefrontProduct.base_price, '299');
      assert.equal(storefrontProduct.is_provisional_price, true);
      assert.equal(storefrontProduct.is_prototype, false);
      assert.equal(storefrontProduct.images.length, 1);
      assert.equal(storefrontProduct.images[0]?.url, 'https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev//catalog/frames/football-ronaldo-1.jpg');
      assert.equal(storefrontProduct.categories.length, 1);
      assert.equal(storefrontProduct.categories[0]?.slug, 'frames');
      assert.equal(storefrontProduct.categories[0]?.name, 'Wall Frames');
    });

    it('should gracefully handle sparse API ProductDto with missing/null optional fields', () => {
      const sparseProduct: ProductDto = {
        id: 'sparse-1',
        name: 'Minimal Poster',
        slug: 'minimal-poster',
        sku: null,
        description: null,
        base_price: '199',
        is_active: true,
        created_at: '2026-10-09T10:33:13.000Z',
        updated_at: '2026-10-09T10:34:18.000Z',
        images: [],
        categories: [],
      };

      const result = adaptApiProductToStorefront(sparseProduct);

      assert.equal(result.id, 'sparse-1');
      assert.equal(result.sku, undefined);
      assert.equal(result.description, undefined);
      assert.equal(result.is_provisional_price, false);
      assert.equal(result.images.length, 0);
      assert.equal(result.categories.length, 0);
    });
  });

  describe('2. Live Staging API Integration Contract Tests', () => {
    it('should fetch 5 canonical categories from staging API', async () => {
      const res = await categoriesApi.getCategories();
      assert.equal(res.success, true, 'Category endpoint returned success: false');
      assert.ok(Array.isArray(res.data), 'Category response data is not an array');
      assert.equal(res.data.length, 5, `Expected 5 categories, got ${res.data.length}`);

      const slugs = res.data.map((c) => c.slug).sort();
      const expectedSlugs = ['bookmarks', 'custom-prints', 'frames', 'posters', 'wall-art'].sort();
      assert.deepEqual(slugs, expectedSlugs, 'Category slugs do not match canonical set');
    });

    it('should fetch page 1 of products and receive exactly 50 items with total 82', async () => {
      const res = await productsApi.getProducts({ page: 1, limit: 50 });
      assert.equal(res.success, true, 'Product endpoint returned success: false');
      assert.ok(Array.isArray(res.data), 'Product response data is not an array');
      assert.equal(res.data.length, 50, `Expected 50 products on page 1, got ${res.data.length}`);
      assert.ok(res.meta, 'Pagination metadata is missing');
      assert.equal(res.meta.total, 82, `Expected 82 total products, got ${res.meta.total}`);
      assert.equal(res.meta.page, 1);
      assert.equal(res.meta.totalPages, 2);
    });

    it('should fetch page 2 of products and receive remaining 32 items', async () => {
      const res = await productsApi.getProducts({ page: 2, limit: 50 });
      assert.equal(res.success, true, 'Product endpoint returned success: false');
      assert.equal(res.data.length, 32, `Expected 32 products on page 2, got ${res.data.length}`);
      assert.equal(res.meta.total, 82);
      assert.equal(res.meta.page, 2);
    });

    it('should filter products by canonical category "frames" returning 49 products', async () => {
      const res = await productsApi.getProducts({ category: 'frames', limit: 50 });
      assert.equal(res.success, true);
      assert.equal(res.meta.total, 49, `Expected 49 frames, got ${res.meta.total}`);
      assert.equal(res.data.length, 49);
    });

    it('should filter products by canonical category "posters" returning 27 products', async () => {
      const res = await productsApi.getProducts({ category: 'posters', limit: 50 });
      assert.equal(res.success, true);
      assert.equal(res.meta.total, 27, `Expected 27 posters, got ${res.meta.total}`);
      assert.equal(res.data.length, 27);
    });

    it('should filter products by canonical category "bookmarks" returning 6 products', async () => {
      const res = await productsApi.getProducts({ category: 'bookmarks', limit: 50 });
      assert.equal(res.success, true);
      assert.equal(res.meta.total, 6, `Expected 6 bookmarks, got ${res.meta.total}`);
      assert.equal(res.data.length, 6);
    });

    it('should filter products by canonical category "custom-prints" returning 0 products (catalogue contains stock items only)', async () => {
      const res = await productsApi.getProducts({ category: 'custom-prints', limit: 50 });
      assert.equal(res.success, true);
      assert.equal(res.meta.total, 0, `Expected 0 custom-prints, got ${res.meta.total}`);
      assert.equal(res.data.length, 0);
    });

    it('should filter products by canonical category "wall-art" returning 55 products', async () => {
      const res = await productsApi.getProducts({ category: 'wall-art', limit: 50 });
      assert.equal(res.success, true);
      assert.equal(res.meta.total, 55, `Expected 55 wall-art items, got ${res.meta.total}`);
      assert.equal(res.data.length, 50); // paginated at limit 50
    });

    it('should fetch a single canonical product by slug with images and category details', async () => {
      const res = await productsApi.getProductBySlug('one-piece-wanted-posters-pack-of-10');
      assert.equal(res.success, true);
      assert.ok(res.data, 'Product data is null');
      assert.equal(res.data.name, 'One Piece Wanted Posters (Pack of 10)');
      assert.equal(res.data.sku, 'FM-PST-OP-WANTED-10');
      assert.equal(res.data.base_price, '249');
      assert.ok(res.data.images.length > 0, 'Product has no images');
      assert.ok(res.data.categories.length > 0, 'Product has no categories');
      assert.equal(res.data.categories[0]?.category?.slug, 'posters');
    });

    it('should adapt all live page 1 products without error or schema mismatch', async () => {
      const res = await productsApi.getProducts({ page: 1, limit: 50 });
      assert.equal(res.success, true);
      const adapted = res.data.map(adaptApiProductToStorefront);
      assert.equal(adapted.length, 50);
      for (const p of adapted) {
        assert.ok(p.id, 'Product missing id');
        assert.ok(p.name, 'Product missing name');
        assert.ok(p.slug, 'Product missing slug');
        assert.ok(p.base_price, 'Product missing base_price');
        assert.equal(typeof p.is_provisional_price, 'boolean');
        assert.equal(p.is_prototype, false);
      }
    });
  });
});
