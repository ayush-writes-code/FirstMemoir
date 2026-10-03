import * as fs from 'fs';
import * as path from 'path';
import assert from 'node:assert';
import { fileURLToPath } from 'url';
import { catalogue } from '../packages/database/prisma/catalogue/data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Repository-owned source manifest
const MANIFEST_PATH = path.resolve(__dirname, '../packages/database/prisma/catalogue/source-manifest.json');

// Optional local disk directory (for local forensic audits)
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
  console.log('===============================================================');
  console.log('=== FIRSTMEMOIR SLICE 3.2: HARDENED RECONCILIATION VERIFICATION ===');
  console.log('===============================================================\n');

  // ─── 1. Load Portable Manifest ──────────────────────────────────────────────
  assert.ok(fs.existsSync(MANIFEST_PATH), `Repository manifest missing at: ${MANIFEST_PATH}`);
  const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  console.log(`[Portability] Repository source manifest loaded: ${manifest.length} records.`);
  assert.strictEqual(manifest.length, 82, 'Repository manifest must contain exactly 82 listings');
  assert.strictEqual(catalogue.length, 82, 'Canonical catalogue must contain exactly 82 products');

  // ─── 2. Optional Local Disk Forensic Audit ──────────────────────────────────
  if (fs.existsSync(SOURCE_DIR)) {
    console.log(`[Local Disk Audit] Auditing against local source directory: ${SOURCE_DIR}`);
    const sourceLeaves = getLeafFolders(SOURCE_DIR).map(f => path.relative(SOURCE_DIR, f)).sort();
    assert.strictEqual(sourceLeaves.length, 82, 'Source disk must contain exactly 82 leaf folders');

    const manifestFolders = manifest.map(m => m.source_folder).sort();
    assert.deepStrictEqual(sourceLeaves, manifestFolders, 'Disk leaf folders must match manifest 1:1');
    console.log(`✅ Disk audit passed: 82 physical folders verified identical to repository manifest.`);
  } else {
    console.log(`[Local Disk Audit] Local disk directory not present (${SOURCE_DIR}).`);
    console.log(`✅ Operating in portable CI/repository manifest verification mode.`);
  }

  // ─── 3. Deterministic 1:1 Mapping Verification ──────────────────────────────
  console.log(`\n[Mapping Verification] Auditing 1:1 mapping between manifest and canonical catalogue...`);
  const canonicalByFolder = new Map<string, any>();
  const canonicalBySku = new Map<string, any>();

  for (const product of catalogue) {
    const src = product.manufacturing_metadata?.source_mapping?.source_folder;
    assert.ok(src, `Product ${product.sku} is missing source_mapping.source_folder`);
    assert.ok(!canonicalByFolder.has(src), `Duplicate canonical mapping for source folder: ${src}`);
    assert.ok(!canonicalBySku.has(product.sku), `Duplicate canonical SKU: ${product.sku}`);

    canonicalByFolder.set(src, product);
    canonicalBySku.set(product.sku, product);
  }

  for (const entry of manifest) {
    const catProd = canonicalByFolder.get(entry.source_folder);
    assert.ok(catProd, `Source folder "${entry.source_folder}" missing in canonical catalogue`);
    assert.strictEqual(catProd.sku, entry.canonical_sku, `SKU mismatch for ${entry.source_folder}`);
  }
  console.log(`✅ 1:1 Mapping verified: All 82 source listings correspond unambiguously to 82 canonical products.`);

  // ─── 4. Exact Price Equality Verification ────────────────────────────────────
  console.log(`\n[Price Provenance Audit] Auditing exact price equality for all source listings...`);
  let sourcePricedCount = 0;
  let exactMatches = 0;
  let priceMismatches = 0;
  let provisionalCount = 0;

  for (const entry of manifest) {
    const catProd = canonicalByFolder.get(entry.source_folder);
    const pricingStatus = catProd.manufacturing_metadata?.pricing_status;
    const isProvisional = catProd.manufacturing_metadata?.provisional_price;

    if (entry.source_selling_price !== null) {
      sourcePricedCount++;
      if (catProd.base_price === entry.source_selling_price) {
        exactMatches++;
      } else {
        console.error(`❌ PRICE MISMATCH: ${entry.canonical_sku} (${entry.source_folder}): source ₹${entry.source_selling_price} vs canonical ₹${catProd.base_price}`);
        priceMismatches++;
      }
      assert.strictEqual(pricingStatus, 'CONFIRMED_SOURCE', `Expected CONFIRMED_SOURCE for ${entry.canonical_sku}`);
      assert.strictEqual(isProvisional, false, `Expected provisional_price=false for ${entry.canonical_sku}`);
    } else {
      provisionalCount++;
      assert.strictEqual(pricingStatus, 'PROVISIONAL_ESTIMATE', `Expected PROVISIONAL_ESTIMATE for ${entry.canonical_sku}`);
      assert.strictEqual(isProvisional, true, `Expected provisional_price=true for ${entry.canonical_sku}`);
      assert.strictEqual(typeof catProd.base_price, 'number');
      assert.ok(catProd.base_price > 0, `Provisional price must be positive for ${entry.canonical_sku}`);
    }
  }

  console.log(`\n-----------------------------------`);
  console.log(`Source-priced listings: ${sourcePricedCount}`);
  console.log(`Exact price matches: ${exactMatches}`);
  console.log(`Price mismatches: ${priceMismatches}`);
  console.log(`Provisional listings: ${provisionalCount}`);
  console.log(`-----------------------------------`);

  assert.strictEqual(sourcePricedCount, 48, 'Must have exactly 48 source-priced listings');
  assert.strictEqual(exactMatches, 48, 'Must have exactly 48 exact price matches');
  assert.strictEqual(priceMismatches, 0, 'Must have zero price mismatches');
  assert.strictEqual(provisionalCount, 34, 'Must have exactly 34 provisional listings');

  // ─── 5. Specification Provenance & Absence of Synthetic Marketing Claims ───
  console.log(`\n[Specification Provenance] Checking factual fidelity and marketing claims...`);
  for (const product of catalogue) {
    const desc = product.desc.toLowerCase();
    assert.ok(!desc.includes('archival paper'), `Synthetic claim "archival paper" found in ${product.sku}`);
    assert.ok(!desc.includes('modern frame moulding'), `Synthetic claim "modern frame moulding" found in ${product.sku}`);
    assert.ok(!desc.includes('signed jersey'), `Ambiguous claim "signed jersey" found in ${product.sku}`);
    assert.ok(!desc.includes('fine art paper'), `Unverified claim "fine art paper" found in ${product.sku}`);
    assert.ok(!desc.includes('coated cardstock'), `Unverified claim "coated cardstock" found in ${product.sku}`);

    const pkg = product.manufacturing_metadata?.provisional_packaging;
    assert.ok(pkg, `Missing packaging metadata for ${product.sku}`);
    assert.strictEqual(pkg.status, 'PROVISIONAL_ESTIMATE', `Packaging status must be PROVISIONAL_ESTIMATE for ${product.sku}`);
  }
  console.log(`✅ Clean descriptions: Zero synthetic claims found across all 82 products.`);
  console.log(`✅ Packaging: All 82 products explicitly tagged as PROVISIONAL_ESTIMATE.`);

  // ─── 6. Identifier Uniqueness ───────────────────────────────────────────────
  const skus = new Set(catalogue.map(p => p.sku));
  const slugs = new Set(catalogue.map(p => p.slug));
  assert.strictEqual(skus.size, 82, 'All 82 SKUs must be unique');
  assert.strictEqual(slugs.size, 82, 'All 82 Slugs must be unique');
  console.log(`✅ Uniqueness: 82 unique SKUs and 82 unique slugs verified.`);

  console.log(`\n🎉 SLICE 3.2 VERIFICATION PASSED: All evidence hardened, 48 exact prices proven, portable across all environments.\n`);
}

runReconciliation();
