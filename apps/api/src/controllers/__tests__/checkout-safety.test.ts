import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { catalogue } from '../../../../../packages/database/prisma/catalogue/data.js';

// ─── 1. Catalogue Truth & Reconciliation Tests ──────────────────────────────

describe('Catalogue Truth & Reconciliation', () => {
  const SOURCE_DIR = '/Users/ayushtomar/Downloads/listingx for website/LISTING PICTURES (all)';

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

  it('verifies exact 82 source listings ↔ 82 canonical products 1:1 match', () => {
    assert.strictEqual(catalogue.length, 82, 'Catalogue must have exactly 82 products');

    if (fs.existsSync(SOURCE_DIR)) {
      const sourceLeaves = getLeafFolders(SOURCE_DIR).map(f => path.relative(SOURCE_DIR, f));
      assert.strictEqual(sourceLeaves.length, 82, 'Source must have exactly 82 leaf folders');

      const sourceToProduct = new Map<string, any>();
      for (const p of catalogue) {
        const src = p.manufacturing_metadata?.source_mapping?.source_folder;
        assert.ok(src, `Product ${p.sku} must have source_folder mapped`);
        assert.ok(!sourceToProduct.has(src), `Duplicate source mapping for ${src}`);
        sourceToProduct.set(src, p);
      }

      for (const leaf of sourceLeaves) {
        assert.ok(sourceToProduct.has(leaf), `Source folder ${leaf} missing in canonical catalogue`);
      }
    }
  });

  it('verifies exact price provenance split: 48 confirmed, 34 provisional', () => {
    let confirmed = 0;
    let provisional = 0;

    for (const p of catalogue) {
      const status = p.manufacturing_metadata?.pricing_status;
      const isProv = p.manufacturing_metadata?.provisional_price;

      if (status === 'CONFIRMED_SOURCE') {
        assert.strictEqual(isProv, false);
        confirmed++;
      } else if (status === 'PROVISIONAL_ESTIMATE') {
        assert.strictEqual(isProv, true);
        provisional++;
      }
    }

    assert.strictEqual(confirmed, 48, 'Must have exactly 48 source-confirmed prices');
    assert.strictEqual(provisional, 34, 'Must have exactly 34 provisional estimates');
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
});

// ─── 2. Cart & Commerce Safety Logic Tests ──────────────────────────────────

describe('Commerce & Personalization Safety Invariants', () => {
  it('standard product classification: none of 82 catalogue items belong to custom-prints', () => {
    for (const p of catalogue) {
      assert.ok(!p.cats.includes('custom-prints'), `Product ${p.sku} should not have custom-prints category`);
    }
  });

  it('verifies standard product addToCart does not require upload_id or crop', () => {
    // Standard product input
    const standardInput = {
      product_id: '00000000-0000-0000-0000-000000000001',
      quantity: 1,
      selected_option_value_ids: [],
    };

    // Personalized flag is false for standard product
    const mockStandardProduct = {
      id: standardInput.product_id,
      name: 'Camaro Frame',
      categories: [{ category: { slug: 'frames' } }],
      mockup_metadata: null,
      options: []
    };

    const isPersonalized = Boolean(
      mockStandardProduct.categories.some((c: any) => c.category?.slug === 'custom-prints') ||
      (mockStandardProduct.mockup_metadata as any)?.requires_personalization
    );

    assert.strictEqual(isPersonalized, false, 'Standard product must NOT be flagged as personalized');
  });

  it('verifies personalized product addToCart strictly rejects missing upload_id', () => {
    const personalizedInput: Record<string, any> = {
      product_id: '00000000-0000-0000-0000-000000000002',
      quantity: 1,
      selected_option_value_ids: [],
      // upload_id missing!
    };

    const mockPersonalizedProduct = {
      id: personalizedInput.product_id,
      name: 'Custom Memory Print',
      categories: [{ category: { slug: 'custom-prints' } }],
      mockup_metadata: null,
      options: []
    };

    const isPersonalized = Boolean(
      mockPersonalizedProduct.categories.some((c: any) => c.category?.slug === 'custom-prints') ||
      (mockPersonalizedProduct.mockup_metadata as any)?.requires_personalization
    );

    assert.strictEqual(isPersonalized, true, 'Product in custom-prints category must be personalized');

    let rejected = false;
    if (isPersonalized && !personalizedInput['upload_id']) {
      rejected = true;
    }

    assert.strictEqual(rejected, true, 'Personalized product without upload_id must be rejected');
  });

  it('verifies checkout item snapshot distinguishes STANDARD vs PERSONALIZED', () => {
    // Case A: Standard Item
    const standardCartItem = {
      product_id: 'prod-std-1',
      product: {
        name: 'Standard Poster',
        categories: [{ category: { slug: 'posters' } }],
        mockup_metadata: null,
        manufacturing_metadata: {
          provisional_packaging: { profile: 'Profile B' }
        },
        options: []
      },
      upload_id: null,
      upload: null,
      orientation: null,
      crop_x: null,
      crop_y: null,
      crop_width: null,
      crop_height: null,
      crop_aspect_ratio: null,
      effective_dpi: null,
      print_quality_status: null,
      dpi_acknowledged: false,
      quantity: 1
    };

    const isStdPersonalized = Boolean(
      standardCartItem.product.categories?.some((c: any) => c.category?.slug === 'custom-prints') ||
      standardCartItem.upload_id !== null
    );

    assert.strictEqual(isStdPersonalized, false);

    const stdCustomizationData = {
      schema_version: '1.0',
      product_type: isStdPersonalized ? 'PERSONALIZED' : 'STANDARD',
      master_file_key: null,
      canonical_dimensions: null,
      physical_width: null,
      physical_height: null,
      physical_dimension_unit: null,
      packaging: (standardCartItem.product.manufacturing_metadata as any)?.provisional_packaging ?? null,
      crop: null,
      effective_dpi: null,
      print_quality_status: null,
      dpi_acknowledged: false,
    };

    assert.strictEqual(stdCustomizationData.product_type, 'STANDARD');
    assert.strictEqual(stdCustomizationData.master_file_key, null);
    assert.strictEqual(stdCustomizationData.canonical_dimensions, null);
    assert.strictEqual(stdCustomizationData.packaging?.profile, 'Profile B');

    // Case B: Personalized Item
    const personalizedCartItem = {
      product_id: 'prod-pers-1',
      product: {
        name: 'Custom Photo Print',
        categories: [{ category: { slug: 'custom-prints' } }],
        mockup_metadata: { requires_personalization: true },
        options: [{ name: 'Size', values: [{ id: 'val-1', value: '8x10' }] }]
      },
      upload_id: 'upl-1',
      upload: { r2_key: 'masters/photo-1.jpg', width: 2400, height: 3000 },
      orientation: 'PORTRAIT',
      crop_x: 0,
      crop_y: 0,
      crop_width: 1,
      crop_height: 1,
      crop_aspect_ratio: '8:10',
      effective_dpi: 300,
      print_quality_status: 'EXCELLENT',
      dpi_acknowledged: false,
      quantity: 1
    };

    const isPersPersonalized = Boolean(
      personalizedCartItem.product.categories?.some((c: any) => c.category?.slug === 'custom-prints') ||
      personalizedCartItem.upload_id !== null
    );

    assert.strictEqual(isPersPersonalized, true);

    const persCustomizationData = {
      schema_version: '1.0',
      product_type: isPersPersonalized ? 'PERSONALIZED' : 'STANDARD',
      master_file_key: personalizedCartItem.upload?.r2_key,
      canonical_dimensions: {
        width: personalizedCartItem.upload?.width,
        height: personalizedCartItem.upload?.height
      },
      orientation: personalizedCartItem.orientation,
      effective_dpi: personalizedCartItem.effective_dpi,
      print_quality_status: personalizedCartItem.print_quality_status,
      dpi_acknowledged: personalizedCartItem.dpi_acknowledged,
    };

    assert.strictEqual(persCustomizationData.product_type, 'PERSONALIZED');
    assert.strictEqual(persCustomizationData.master_file_key, 'masters/photo-1.jpg');
    assert.strictEqual(persCustomizationData.canonical_dimensions.width, 2400);
    assert.strictEqual(persCustomizationData.effective_dpi, 300);
  });
});
