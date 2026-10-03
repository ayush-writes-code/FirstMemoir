import * as fs from 'fs';
import * as path from 'path';
import assert from 'node:assert';
import { catalogue } from '../packages/database/prisma/catalogue/data';

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

function runReconciliation() {
  console.log('=== STEP 5: 82-LISTING DETERMINISTIC RECONCILIATION AUDIT ===');

  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Source directory not found: ${SOURCE_DIR}`);
  }

  const sourceLeaves = getLeafFolders(SOURCE_DIR).map(f => path.relative(SOURCE_DIR, f));
  console.log(`Source leaf folders found: ${sourceLeaves.length}`);
  console.log(`Canonical catalogue entries: ${catalogue.length}`);

  assert.strictEqual(sourceLeaves.length, 82, 'Expected exactly 82 source leaf folders');
  assert.strictEqual(catalogue.length, 82, 'Expected exactly 82 canonical products');

  // Check 1-to-1 mapping
  const sourceToProduct = new Map<string, any>();
  const productToSource = new Map<string, string>();
  const duplicateSources: string[] = [];
  const duplicateProducts: string[] = [];

  for (const product of catalogue) {
    const src = product.manufacturing_metadata?.source_mapping?.source_folder;
    if (!src) {
      throw new Error(`Product ${product.sku} is missing source_mapping.source_folder`);
    }

    if (productToSource.has(product.sku)) {
      duplicateProducts.push(product.sku);
    }
    productToSource.set(product.sku, src);

    if (sourceToProduct.has(src)) {
      duplicateSources.push(src);
    }
    sourceToProduct.set(src, product);
  }

  const unmatchedSource = sourceLeaves.filter(s => !sourceToProduct.has(s));
  const extraProducts = catalogue.filter(p => !sourceLeaves.includes(p.manufacturing_metadata?.source_mapping?.source_folder));

  console.log(`Matched listings: ${sourceToProduct.size}`);
  console.log(`Unmatched source listings: ${unmatchedSource.length}`);
  console.log(`Extra canonical products: ${extraProducts.length}`);
  console.log(`Duplicate source mappings: ${duplicateSources.length}`);
  console.log(`Duplicate canonical mappings: ${duplicateProducts.length}`);

  if (unmatchedSource.length > 0) {
    console.error('Unmatched sources:', unmatchedSource);
  }
  if (extraProducts.length > 0) {
    console.error('Extra products:', extraProducts.map(p => p.sku));
  }

  assert.strictEqual(unmatchedSource.length, 0, 'No source listings should be unmatched');
  assert.strictEqual(extraProducts.length, 0, 'No extra canonical products allowed');
  assert.strictEqual(duplicateSources.length, 0, 'No duplicate source folder mappings allowed');
  assert.strictEqual(duplicateProducts.length, 0, 'No duplicate products allowed');

  // Check Price Provenance
  let confirmedCount = 0;
  let provisionalCount = 0;

  for (const product of catalogue) {
    const status = product.manufacturing_metadata?.pricing_status;
    const isProv = product.manufacturing_metadata?.provisional_price;

    if (status === 'CONFIRMED_SOURCE') {
      assert.strictEqual(isProv, false, `Confirmed price for ${product.sku} must have provisional_price=false`);
      confirmedCount++;
    } else if (status === 'PROVISIONAL_ESTIMATE') {
      assert.strictEqual(isProv, true, `Provisional price for ${product.sku} must have provisional_price=true`);
      provisionalCount++;
    } else {
      throw new Error(`Unknown pricing_status ${status} on product ${product.sku}`);
    }
  }

  console.log(`\nPrice Provenance Split:`);
  console.log(`- Source-confirmed prices: ${confirmedCount}`);
  console.log(`- Provisional estimates: ${provisionalCount}`);

  assert.strictEqual(confirmedCount, 48, 'Expected exactly 48 confirmed source prices');
  assert.strictEqual(provisionalCount, 34, 'Expected exactly 34 provisional estimated prices');

  // Check SKU and Slug Uniqueness
  const skus = new Set<string>();
  const slugs = new Set<string>();
  const duplicateSkus: string[] = [];
  const duplicateSlugs: string[] = [];

  for (const product of catalogue) {
    if (skus.has(product.sku)) duplicateSkus.push(product.sku);
    skus.add(product.sku);

    if (slugs.has(product.slug)) duplicateSlugs.push(product.slug);
    slugs.add(product.slug);
  }

  console.log(`\nIdentifier Uniqueness:`);
  console.log(`- Unique SKUs: ${skus.size} (Duplicates: ${duplicateSkus.length})`);
  console.log(`- Unique Slugs: ${slugs.size} (Duplicates: ${duplicateSlugs.length})`);

  assert.strictEqual(skus.size, 82, 'All 82 SKUs must be unique');
  assert.strictEqual(slugs.size, 82, 'All 82 Slugs must be unique');

  // Check Removal of Synthesized / Unsupported Claims
  console.log(`\nUnsupported Facts Audit:`);
  for (const product of catalogue) {
    const desc = product.desc.toLowerCase();
    assert.ok(!desc.includes('archival paper'), `Product ${product.sku} contains synthesized claim "archival paper"`);
    assert.ok(!desc.includes('modern frame moulding'), `Product ${product.sku} contains synthesized claim "modern frame moulding"`);
    assert.ok(!desc.includes('signed jersey'), `Product ${product.sku} contains ambiguous claim "signed jersey"`);
    assert.ok(!desc.includes('fine art paper'), `Product ${product.sku} contains unverified claim "fine art paper"`);
    assert.ok(!desc.includes('coated cardstock'), `Product ${product.sku} contains unverified claim "coated cardstock"`);
  }
  console.log(`✅ All synthesized/unsupported marketing claims successfully verified absent.`);

  // Check Packaging Metadata
  for (const product of catalogue) {
    const pkg = product.manufacturing_metadata?.provisional_packaging;
    assert.ok(pkg, `Product ${product.sku} must have provisional_packaging`);
    assert.strictEqual(pkg.status, 'PROVISIONAL_ESTIMATE', `Packaging status must be PROVISIONAL_ESTIMATE for ${product.sku}`);
  }
  console.log(`✅ All packaging metadata explicitly verified as PROVISIONAL_ESTIMATE.`);

  console.log(`\n🎉 RECONCILIATION AUDIT PASSED: 82 source listings ↔ 82 canonical products (1:1 perfect match)`);
}

runReconciliation();
