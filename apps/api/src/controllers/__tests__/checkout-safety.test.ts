import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { catalogue } from '../../../../../packages/database/prisma/catalogue/data.js';
import { cartService } from '../../services/cart.service.js';
import { checkoutService } from '../../services/checkout.service.js';
import { razorpayService } from '../../services/razorpay.service.js';
import { prisma, Prisma } from '@repo/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Repository-owned source manifest path
const MANIFEST_PATH = path.resolve(__dirname, '../../../../../packages/database/prisma/catalogue/source-manifest.json');

// Optional local source directory (for local verification)
const SOURCE_DIR = process.env.SOURCE_CATALOG_DIR || '/Users/ayushtomar/Downloads/listingx for website/LISTING PICTURES (all)';

interface ManifestEntry {
  source_folder: string;
  canonical_sku: string;
  canonical_name: string;
  canonical_base_price: number;
  has_info: boolean;
  source_title: string | null;
  source_brand: string | null;
  source_product_type: string | null;
  source_sku: string | null;
  source_selling_price: number | null;
  source_raw_selling_price: string | null;
  source_mrp: number | null;
  source_dimensions: string | null;
  source_paper: string | null;
  image_count: number;
  image_files: string[];
  provenance: {
    identity: 'VERIFIED' | 'PROVISIONAL' | 'UNKNOWN';
    price: 'VERIFIED' | 'PROVISIONAL' | 'UNKNOWN';
    dimensions: 'VERIFIED' | 'PROVISIONAL' | 'UNKNOWN';
    paper: 'VERIFIED' | 'PROVISIONAL' | 'UNKNOWN';
  };
}

// ─── 1. Catalogue Truth & Reconciliation Tests ──────────────────────────────

describe('Catalogue Truth & Reconciliation', () => {
  function getLeafFolders(dir: string): string[] {
    let results: string[] = [];
    const items = fs.readdirSync(dir);
    let hasSubdir = false;
    for (const item of items) {
      if (item.startsWith('.')) continue;
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) {
        hasSubdir = true;
        results = results.concat(getLeafFolders(full));
      }
    }
    if (!hasSubdir) results.push(dir);
    return results;
  }

  it('verifies exact 82 source listings ↔ 82 canonical products 1:1 match via portable manifest', () => {
    assert.ok(fs.existsSync(MANIFEST_PATH), `Source manifest missing at ${MANIFEST_PATH}`);
    const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

    assert.strictEqual(manifest.length, 82, 'Manifest must contain exactly 82 listings');
    assert.strictEqual(catalogue.length, 82, 'Catalogue must have exactly 82 products');

    const sourceToProduct = new Map<string, any>();
    for (const p of catalogue) {
      const src = p.manufacturing_metadata?.source_mapping?.source_folder;
      assert.ok(src, `Product ${p.sku} must have source_folder mapped`);
      assert.ok(!sourceToProduct.has(src), `Duplicate source mapping for ${src}`);
      sourceToProduct.set(src, p);
    }

    for (const entry of manifest) {
      assert.ok(sourceToProduct.has(entry.source_folder), `Manifest folder ${entry.source_folder} missing in canonical catalogue`);
      const prod = sourceToProduct.get(entry.source_folder);
      assert.strictEqual(prod.sku, entry.canonical_sku, `SKU mismatch between manifest and canonical catalogue`);
    }

    // If local disk directory exists, also verify physical disk matches manifest
    if (fs.existsSync(SOURCE_DIR)) {
      const sourceLeaves = getLeafFolders(SOURCE_DIR).map(f => path.relative(SOURCE_DIR, f)).sort();
      const manifestFolders = manifest.map(m => m.source_folder).sort();
      assert.deepStrictEqual(sourceLeaves, manifestFolders, 'Local disk leaf folders must match manifest 1:1');
    }
  });

  it('verifies exact price provenance: 48 confirmed source prices equal canonical base_price, 34 provisional', () => {
    const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const canonicalByFolder = new Map(catalogue.map(p => [p.manufacturing_metadata?.source_mapping?.source_folder, p]));

    let sourcePricedCount = 0;
    let exactMatches = 0;
    let priceMismatches = 0;
    let provisionalCount = 0;

    for (const entry of manifest) {
      const p = canonicalByFolder.get(entry.source_folder);
      assert.ok(p, `Canonical product not found for ${entry.source_folder}`);

      const status = p.manufacturing_metadata?.pricing_status;
      const isProv = p.manufacturing_metadata?.provisional_price;

      if (entry.source_selling_price !== null) {
        sourcePricedCount++;
        assert.strictEqual(status, 'CONFIRMED_SOURCE');
        assert.strictEqual(isProv, false);

        if (p.base_price === entry.source_selling_price) {
          exactMatches++;
        } else {
          priceMismatches++;
        }
      } else {
        provisionalCount++;
        assert.strictEqual(status, 'PROVISIONAL_ESTIMATE');
        assert.strictEqual(isProv, true);
        assert.strictEqual(typeof p.base_price, 'number');
        assert.ok(p.base_price > 0, `Provisional price must be positive for ${p.sku}`);
      }
    }

    assert.strictEqual(sourcePricedCount, 48, 'Must have exactly 48 source-priced listings');
    assert.strictEqual(exactMatches, 48, 'Must have exactly 48 exact price matches');
    assert.strictEqual(priceMismatches, 0, 'Must have zero price mismatches');
    assert.strictEqual(provisionalCount, 34, 'Must have exactly 34 provisional estimates');
  });

  it('verifies identifier uniqueness: no duplicate SKUs or slugs', () => {
    const skus = new Set<string>();
    const slugs = new Set<string>();

    for (const p of catalogue) {
      assert.ok(!skus.has(p.sku), `Duplicate SKU found: ${p.sku}`);
      skus.add(p.sku);

      assert.ok(!slugs.has(p.slug), `Duplicate slug found: ${p.slug}`);
      slugs.add(p.slug);
    }

    assert.strictEqual(skus.size, 82);
    assert.strictEqual(slugs.size, 82);
  });

  it('verifies absence of synthesized/unsupported marketing claims', () => {
    for (const p of catalogue) {
      const desc = p.desc.toLowerCase();
      assert.ok(!desc.includes('archival paper'), `Synthetic claim in ${p.sku}`);
      assert.ok(!desc.includes('modern frame moulding'), `Synthetic claim in ${p.sku}`);
      assert.ok(!desc.includes('signed jersey'), `Ambiguous claim in ${p.sku}`);
      assert.ok(!desc.includes('fine art paper'), `Unverified claim in ${p.sku}`);
      assert.ok(!desc.includes('coated cardstock'), `Unverified claim in ${p.sku}`);

      const pkg = p.manufacturing_metadata?.provisional_packaging;
      assert.ok(pkg, `Missing packaging metadata for ${p.sku}`);
      assert.strictEqual(pkg.status, 'PROVISIONAL_ESTIMATE');
    }
  });

  it('verifies standard product classification: none of 82 catalogue items belong to custom-prints', () => {
    for (const p of catalogue) {
      assert.ok(!p.cats.includes('custom-prints'), `Product ${p.sku} should not have custom-prints category`);
    }
  });
});

// ─── 2. Real Service-Level Commerce & Personalization Safety Tests ───────────

describe('Commerce & Personalization Safety - Real Service Invocations', () => {
  // Test harness fixtures
  let createdOrders: any[] = [];
  let cartStore: Record<string, any> = {};

  beforeEach(() => {
    createdOrders = [];
    cartStore = {};

    // Mock Razorpay SDK order creation
    razorpayService.createOrder = async (amount: number, receipt: string) => {
      return {
        id: `rzp_test_order_${Date.now()}`,
        amount: Math.round(amount * 100),
        currency: 'INR',
        status: 'created',
        receipt,
      } as any;
    };
  });

  it('CASE A: Standard catalogue product can be added to cart without upload/crop and initializes checkout cleanly', async () => {
    const sessionId = 'session-case-a';
    const standardProduct = catalogue.find(p => p.sku === 'FM-FRM-POR-GT3')!;
    assert.ok(standardProduct, 'FM-FRM-POR-GT3 must exist in catalogue');

    const dbStandardProduct = {
      id: 'prod-gt3-id',
      name: standardProduct.name,
      slug: standardProduct.slug,
      sku: standardProduct.sku,
      base_price: new Prisma.Decimal(standardProduct.base_price),
      categories: standardProduct.cats.map(slug => ({ category: { slug, name: slug } })),
      mockup_metadata: null,
      manufacturing_metadata: standardProduct.manufacturing_metadata,
      options: []
    };

    const cart = {
      id: 'cart-case-a',
      session_id: sessionId,
      user_id: null,
      status: 'ACTIVE',
      items: [] as any[]
    };
    cartStore[sessionId] = cart;

    // Configure Prisma mocks for Case A
    prisma.storeSettings.findUnique = (async () => ({ id: 'default', pricing_version: 1 })) as any;
    prisma.cart.findUnique = (async ({ where }: any) => {
      return cartStore[where.session_id] || null;
    }) as any;
    prisma.cart.create = (async ({ data }: any) => {
      const newCart = { id: 'cart-case-a', ...data, items: [] };
      cartStore[data.session_id] = newCart;
      return newCart;
    }) as any;
    prisma.product.findUnique = (async ({ where }: any) => {
      if (where.id === 'prod-gt3-id') return dbStandardProduct;
      return null;
    }) as any;
    prisma.productOptionValue.findMany = (async () => []) as any;
    prisma.cartLineItem.create = (async ({ data }: any) => {
      const item = {
        id: 'line-item-std-1',
        ...data,
        product: dbStandardProduct,
        selected_option_values: [],
        upload: null
      };
      cart.items.push(item);
      return item;
    }) as any;
    prisma.order.findFirst = (async () => null) as any;
    prisma.order.updateMany = (async () => ({ count: 1 })) as any;
    prisma.cart.update = (async ({ where, data }: any) => {
      Object.assign(cart, data);
      return cart;
    }) as any;
    prisma.$transaction = (async (fn: any) => {
      const tx = {
        order: {
          updateMany: async () => ({ count: 1 }),
          create: async ({ data }: any) => {
            const orderId = 'order-std-case-a';
            const ord = {
              id: orderId,
              ...data,
              items: data.items.create.map((it: any, idx: number) => ({
                id: 'ord-item-' + idx,
                order_id: orderId,
                ...it
              }))
            };
            createdOrders.push(ord);
            return ord;
          }
        },
        userUpload: { updateMany: async () => ({ count: 0 }) },
        cart: {
          update: async ({ where, data }: any) => {
            Object.assign(cart, data);
            return cart;
          }
        }
      };
      return fn(tx);
    }) as any;

    // 1. Invoke REAL cartService.addToCart without upload_id, crop, or preview_url
    const lineItem = await cartService.addToCart(
      {
        product_id: 'prod-gt3-id',
        quantity: 1,
        selected_option_value_ids: [],
      },
      sessionId
    );

    assert.ok(lineItem, 'Standard item must be added successfully');
    assert.strictEqual(lineItem.upload_id, null, 'Standard item upload_id must be null');
    assert.strictEqual(lineItem.crop_width, null, 'Standard item crop must be null');
    assert.strictEqual(lineItem.effective_dpi, null, 'Standard item effective_dpi must be null');
    assert.strictEqual(lineItem.preview_url, null, 'Standard item preview_url must be null');

    // 2. Invoke REAL checkoutService.initializeCheckout
    const checkoutResult = await checkoutService.initializeCheckout(
      sessionId,
      undefined,
      {
        customer_email: 'buyer@example.com',
        customer_phone: '+919988776655',
        shipping_address: {
          name: 'Buyer Name',
          line1: '123 MG Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          postal_code: '560001',
          country: 'IN'
        }
      }
    );

    assert.ok(checkoutResult.orderId);
    assert.ok(checkoutResult.razorpayOrderId);
    assert.strictEqual(checkoutResult.amount, 24900, 'Price must match base_price ₹249 in paise');

    // 3. Verify Order & OrderItem snapshot invariants
    const createdOrder = createdOrders.find(o => o.id === checkoutResult.orderId);
    assert.ok(createdOrder, 'Order must be created in DB transaction');
    assert.strictEqual(createdOrder.items.length, 1);

    const snapshot = createdOrder.items[0].customization_data;
    assert.strictEqual(snapshot.product_type, 'STANDARD', 'Snapshot product_type must be STANDARD');
    assert.strictEqual(snapshot.master_file_key, null, 'Standard product master_file_key must be null');
    assert.strictEqual(snapshot.canonical_dimensions, null, 'Standard product canonical_dimensions must be null');
    assert.strictEqual(snapshot.effective_dpi, null, 'Standard product effective_dpi must be null');
    assert.ok(snapshot.packaging, 'Standard product must capture packaging metadata');
    assert.strictEqual(snapshot.packaging.profile, standardProduct.manufacturing_metadata?.provisional_packaging?.profile);
  });

  it('CASE B: Personalized product strictly rejects addToCart when upload_id is missing without creating DB line item', async () => {
    const sessionId = 'session-case-b';

    const dbPersonalizedProduct = {
      id: 'prod-pers-id',
      name: 'Custom Memory Photo Print',
      slug: 'custom-memory-photo-print',
      sku: 'FM-CUS-PRN-0001',
      base_price: new Prisma.Decimal(499),
      categories: [{ category: { slug: 'custom-prints', name: 'Custom Prints' } }],
      mockup_metadata: { requires_personalization: true },
      manufacturing_metadata: null,
      options: []
    };

    const cart = {
      id: 'cart-case-b',
      session_id: sessionId,
      user_id: null,
      status: 'ACTIVE',
      items: [] as any[]
    };
    cartStore[sessionId] = cart;

    prisma.storeSettings.findUnique = (async () => ({ id: 'default', pricing_version: 1 })) as any;
    prisma.cart.findUnique = (async ({ where }: any) => cartStore[where.session_id] || null) as any;
    prisma.product.findUnique = (async ({ where }: any) => {
      if (where.id === 'prod-pers-id') return dbPersonalizedProduct;
      return null;
    }) as any;

    let lineItemCreated = false;
    prisma.cartLineItem.create = (async () => {
      lineItemCreated = true;
      return {};
    }) as any;

    // 1. Invoke REAL cartService.addToCart missing upload_id
    let caughtError: any = null;
    try {
      await cartService.addToCart(
        {
          product_id: 'prod-pers-id',
          quantity: 1,
          selected_option_value_ids: [],
          // upload_id missing!
        },
        sessionId
      );
    } catch (err: any) {
      caughtError = err;
    }

    // 2. Assert rejection behavior
    assert.ok(caughtError, 'Must throw validation error');
    assert.strictEqual(caughtError.statusCode, 400, 'Must return HTTP 400 Bad Request');
    assert.ok(
      caughtError.message.includes('Personalized product requires a photo upload'),
      `Error message must indicate missing photo upload: "${caughtError.message}"`
    );
    assert.strictEqual(lineItemCreated, false, 'No cart line item must be persisted in DB');
    assert.strictEqual(cart.items.length, 0, 'Cart items array must remain empty');
  });

  it('CASE C: Personalized product with valid upload passes validation, initializes checkout, and persists master_file_key', async () => {
    const sessionId = 'session-case-c';

    const dbPersonalizedProduct = {
      id: 'prod-pers-id-2',
      name: 'Custom Memory Photo Print',
      slug: 'custom-memory-photo-print',
      sku: 'FM-CUS-PRN-0001',
      base_price: new Prisma.Decimal(499),
      categories: [{ category: { slug: 'custom-prints', name: 'Custom Prints' } }],
      mockup_metadata: { requires_personalization: true },
      manufacturing_metadata: null,
      options: [
        {
          id: 'opt-size',
          name: 'Size',
          values: [
            {
              id: 'val-8x10',
              value: '8x10',
              price_modifier: new Prisma.Decimal(0),
              modifier_type: 'FLAT',
              metadata: { width: 8, height: 10, unit: 'in' }
            }
          ]
        }
      ]
    };

    const mockUpload = {
      id: 'upload-valid-123',
      session_id: sessionId,
      user_id: null,
      status: 'READY',
      retention_status: 'UNATTACHED',
      r2_key: 'masters/high-res-print-master.jpg',
      width: 2400,
      height: 3000,
    };

    const cart = {
      id: 'cart-case-c',
      session_id: sessionId,
      user_id: null,
      status: 'ACTIVE',
      items: [] as any[]
    };
    cartStore[sessionId] = cart;

    // Prisma mocks for Case C
    prisma.storeSettings.findUnique = (async () => ({ id: 'default', pricing_version: 1 })) as any;
    prisma.cart.findUnique = (async ({ where }: any) => cartStore[where.session_id] || null) as any;
    prisma.product.findUnique = (async ({ where }: any) => {
      if (where.id === 'prod-pers-id-2') return dbPersonalizedProduct;
      return null;
    }) as any;
    prisma.productOptionValue.findMany = (async ({ where }: any) => {
      if (where?.id?.in?.includes('val-8x10')) {
        return [
          {
            id: 'val-8x10',
            value: '8x10',
            price_modifier: new Prisma.Decimal(0),
            modifier_type: 'FLAT',
            option: { name: 'Size', product_id: 'prod-pers-id-2' }
          }
        ];
      }
      return [];
    }) as any;
    prisma.userUpload.findUnique = (async ({ where }: any) => {
      if (where.id === 'upload-valid-123') return mockUpload;
      return null;
    }) as any;
    prisma.userUpload.update = (async ({ where, data }: any) => {
      Object.assign(mockUpload, data);
      return mockUpload;
    }) as any;
    prisma.userUpload.updateMany = (async () => ({ count: 1 })) as any;

    prisma.cartLineItem.create = (async ({ data }: any) => {
      const item = {
        id: 'line-item-pers-1',
        ...data,
        product: dbPersonalizedProduct,
        selected_option_values: [
          { product_option_value_id: 'val-8x10', option_value: dbPersonalizedProduct.options[0]!.values[0]! }
        ],
        upload: mockUpload
      };
      cart.items.push(item);
      return item;
    }) as any;

    prisma.order.findFirst = (async () => null) as any;
    prisma.order.updateMany = (async () => ({ count: 1 })) as any;
    prisma.cart.update = (async ({ where, data }: any) => {
      Object.assign(cart, data);
      return cart;
    }) as any;

    prisma.$transaction = (async (fn: any) => {
      const tx = {
        order: {
          updateMany: async () => ({ count: 1 }),
          create: async ({ data }: any) => {
            const orderId = 'order-pers-case-c';
            const ord = {
              id: orderId,
              ...data,
              items: data.items.create.map((it: any, idx: number) => ({
                id: 'ord-item-' + idx,
                order_id: orderId,
                ...it
              }))
            };
            createdOrders.push(ord);
            return ord;
          }
        },
        userUpload: { updateMany: async () => ({ count: 1 }) },
        cart: {
          update: async ({ where, data }: any) => {
            Object.assign(cart, data);
            return cart;
          }
        }
      };
      return fn(tx);
    }) as any;

    // 1. Invoke REAL cartService.addToCart with valid upload and crop
    const lineItem = await cartService.addToCart(
      {
        product_id: 'prod-pers-id-2',
        quantity: 1,
        selected_option_value_ids: ['val-8x10'],
        upload_id: 'upload-valid-123',
        preview_url: 'https://cdn.example.com/previews/preview.jpg',
        orientation: 'PORTRAIT',
        crop: {
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          aspect_ratio: '8:10'
        },
        effective_dpi: 300,
        print_quality_status: 'EXCELLENT',
        dpi_acknowledged: false,
      },
      sessionId
    );

    assert.ok(lineItem, 'Personalized line item must be created');
    assert.strictEqual(lineItem.upload_id, 'upload-valid-123');
    assert.strictEqual(lineItem.effective_dpi, 300);
    assert.strictEqual(mockUpload.status, 'LINKED_TO_CART');
    assert.strictEqual(mockUpload.retention_status, 'CART_ATTACHED');

    // 2. Invoke REAL checkoutService.initializeCheckout
    const checkoutResult = await checkoutService.initializeCheckout(
      sessionId,
      undefined,
      {
        customer_email: 'jane@example.com',
        customer_phone: '+919123456789',
        shipping_address: {
          name: 'Jane Doe',
          line1: '456 Brigade Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          postal_code: '560025',
          country: 'IN'
        }
      }
    );

    assert.ok(checkoutResult.orderId);
    assert.ok(checkoutResult.razorpayOrderId);
    assert.strictEqual(checkoutResult.amount, 49900, 'Price must match base_price ₹499 in paise');

    // 3. Verify Order & OrderItem snapshot invariants
    const createdOrder = createdOrders.find(o => o.id === checkoutResult.orderId);
    assert.ok(createdOrder, 'Order must be created in DB transaction');
    assert.strictEqual(createdOrder.items.length, 1);

    const snapshot = createdOrder.items[0].customization_data;
    assert.strictEqual(snapshot.product_type, 'PERSONALIZED');
    assert.strictEqual(snapshot.master_file_key, 'masters/high-res-print-master.jpg', 'master_file_key must be populated from upload record');
    assert.deepStrictEqual(snapshot.canonical_dimensions, { width: 2400, height: 3000 });
    assert.strictEqual(snapshot.physical_width, 8);
    assert.strictEqual(snapshot.physical_height, 10);
    assert.strictEqual(snapshot.physical_dimension_unit, 'in');
    assert.strictEqual(snapshot.effective_dpi, 300);
    assert.strictEqual(snapshot.print_quality_status, 'EXCELLENT');
    assert.deepStrictEqual(snapshot.crop, { x: 0, y: 0, width: 1, height: 1 });
  });
});
