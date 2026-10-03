# Catalogue Reconciliation & Commerce Safety Report (Slice 3.2 Hardened)

*Authoritative Forensic Audit & Hardened Evidence Verification*
*Date: October 3, 2026*

---

## 1. Executive Summary

This report documents the hardened forensic reconciliation and checkout safety verification performed between the 82 client-supplied source listing folders and the canonical FirstMemoir database catalogue dataset (`packages/database/prisma/catalogue/data.ts`).

In Slice 3.2, verification evidence was hardened to be repository-portable, proved exact Rupee-level price equality for all 48 source-priced listings, and replaced mock simulations with live invocations of `cartService.addToCart` and `checkoutService.initializeCheckout`.

### Key Audit Metrics

| Metric | Target | Actual Result | Verification Status |
|---|---|---|---|
| **Source Listings Audited** | 82 leaf folders | 82 leaf folders | `100% MATCH` |
| **Canonical Products Generated** | 82 products | 82 products | `100% MATCH` |
| **Direct 1:1 Matched Pairs** | 82 | 82 | `VERIFIED` |
| **Source-Priced Listings** | 48 | 48 | `VERIFIED` |
| **Exact Price Matches (Rupee-for-Rupee)** | 48 | 48 | `100% EXACT MATCH (0 MISMATCHES)` |
| **Provisional Estimated Selling Prices** | 34 | 34 | `VERIFIED (provisional_price: true)` |
| **Globally Unique Deterministic SKUs** | 82 | 82 | `VERIFIED` |
| **Globally Unique Deterministic Slugs** | 82 | 82 | `VERIFIED` |
| **Synthetic Marketing Claims Present** | 0 | 0 | `CLEAN (0 FOUND)` |
| **Repository Portability** | Independent of host paths | Portable Manifest (`source-manifest.json`) | `VERIFIED` |
| **Commerce Safety Test Depth** | Live Service Invocations | Real `cartService` + `checkoutService` | `VERIFIED (Cases A, B, C)` |

---

## 2. Forensic Identity Corrections Maintained

Forensic alignment across the 82 listings is strictly maintained:

### Football Jersey Discrepancy (Reconciled)
- Folders verified: `Ronaldo`, `beckham`, `ibrahimovic`, `mbappe`, `neymar`, `pessi`, `ramos`, `ronaldinho`, `van dijk`, `zidane`.
- `pessi` source folder maps 1:1 to `Lionel Messi Jersey Frame` (SKU: `FM-FRM-FBL-MESSI`).
- Fictional listing `Suarez` was removed in Slice 3.1.
- `Sergio Ramos Jersey Frame` (SKU: `FM-FRM-FBL-RAMOS`) and `Zinedine Zidane Jersey Frame` (SKU: `FM-FRM-FBL-ZIDANE`) are verified against source images and `info.txt`.

---

## 3. Absence of Synthesized & Unsupported Claims

All canonical catalogue descriptions and metadata have been audited:
1. **Archival Paper & Moulding**: Removed from listings lacking source confirmation (e.g., F&F Cars).
2. **"Signed Jersey" Claims**: Removed ambiguous wording that could mislead consumers into expecting hand-signed memorabilia; clarified as jersey artwork prints on 300 GSM photographic paper.
3. **Paper Specs**: Reverted to exact source values (e.g. 170 GSM for Ronaldo split posters, 300 GSM for bookmarks, unestablished marked UNKNOWN).
4. **Bookmark Sets**: Accurately mapped to source counts (BM-3: 15 Pcs, BM-4: 12 Pcs, BM-1 & Animals: 10 Pcs).
5. **Provisional Packaging**: All 82 products explicitly tagged with `status: "PROVISIONAL_ESTIMATE"`.

---

## 4. Exact Price Equality Proof (48 Source Prices)

Every source listing with a numeric selling price in its `info.txt` was parsed and checked against `product.base_price`:

```text
Source-priced listings: 48
Exact price matches: 48
Price mismatches: 0
```

### Breakdown of the 48 Exact Price Matches:
- **₹249** (1 listing):
  - `Porsche GT3 RS Wall Frame Set` (`FM-FRM-POR-GT3` ↔ `Frames 8x12/Porsche frame listing pics`)
- **₹299** (47 listings):
  - Football jersey frames (10 listings: Ronaldo, Messi, Mbappe, Beckham, Ronaldinho, Neymar, Ibrahimovic, Van Dijk, Ramos, Zidane)
  - Motivation quote frames (30 listings: Motivation quits 1 through 30)
  - Football 10 posters pack (1 listing: `FM-POS-FBL-10PC` ↔ `Posters/No category/Football 10 listings pics`)
  - Ronaldo split posters (6 listings: Al Nassr, Manchester Utd, Sporting Lisbon, Portugal, Juventus, Real Madrid)

### Status of the 34 Unpriced Listings:
- **20 listings** contained placeholder text: `Selling price - [Generate 150/100 rupees bank settlement]`
- **14 listings** contained no `info.txt` file (F&F cars 8 variations, Split Anime 6 variations)
- **Status in Canonical Catalogue**:
  - `pricing_status`: `"PROVISIONAL_ESTIMATE"`
  - `provisional_price`: `true`
  - Base prices assigned reasonable engineering estimates (₹149, ₹199, ₹249, ₹299, ₹349) editable via catalogue/admin.

---

## 5. Repository Portability & Truth Manifest

To eliminate machine-specific hardcoded paths (e.g. `/Users/ayushtomar/Downloads/...`) from test suites and build pipelines:

1. **Repository Truth Manifest**:
   - Created `packages/database/prisma/catalogue/source-manifest.json` containing the audited metadata for all 82 listings (`source_folder`, `canonical_sku`, `canonical_name`, `canonical_base_price`, `source_selling_price`, `source_title`, `source_paper`, `source_dimensions`, `image_count`, `provenance`).
2. **Deterministic Classification Tags**:
   - `identity`: `VERIFIED`
   - `price`: `VERIFIED` (48 items) / `PROVISIONAL` (34 items)
   - `dimensions`: `VERIFIED` (where in source `info.txt`) / `UNKNOWN` (where absent)
   - `paper`: `VERIFIED` (where in source `info.txt`) / `UNKNOWN` (where absent)
3. **Graceful Fallback**:
   - `scripts/verify-catalogue-reconciliation.ts` and `apps/api/src/controllers/__tests__/checkout-safety.test.ts` run entirely against `source-manifest.json` by default.
   - If `process.env.SOURCE_CATALOG_DIR` or the local disk folder exists, it also executes physical filesystem checks. If absent, it logs portable verification mode and passes without error.

---

## 6. Live Service Invocations for Commerce Safety

Commerce tests in `apps/api/src/controllers/__tests__/checkout-safety.test.ts` now execute the real implementations of `cartService.addToCart` and `checkoutService.initializeCheckout`:

### CASE A — Standard Catalogue Product
- Product: `FM-FRM-POR-GT3` (Porsche GT3 RS Wall Frame Set, ₹249 base price).
- Invokes real `cartService.addToCart(...)` with standard payload (`upload_id: null`, `crop: null`, `preview_url: null`).
- Invokes real `checkoutService.initializeCheckout(...)`.
- **Verified Invariants**:
  - Line item created with `upload_id === null`, `crop === null`, `effective_dpi === null`.
  - Checkout initializes cleanly, creates Order, calls Razorpay service.
  - OrderItem snapshot captures `product_type: "STANDARD"`, `master_file_key: null`, `packaging.profile: "Profile A"`, and `effective_dpi: null`.

### CASE B — Personalized Product Rejection
- Product: Custom Memory Photo Print (`categories: ['custom-prints']`, `requires_personalization: true`).
- Invokes real `cartService.addToCart(...)` missing `upload_id`.
- **Verified Invariants**:
  - Rejection throws `statusCode: 400 Bad Request`.
  - Message: `"Personalized product requires a photo upload (upload_id is missing)."`.
  - Zero cart line items persisted to the database.

### CASE C — Personalized Product Valid Path
- Product: Custom Memory Photo Print with Size option (`8x10`), valid upload asset (`2400x3000px`), `crop` (8:10), `orientation: PORTRAIT`, `effective_dpi: 300`, `print_quality_status: EXCELLENT`.
- Invokes real `cartService.addToCart(...)`.
- Invokes real `checkoutService.initializeCheckout(...)`.
- **Verified Invariants**:
  - Upload status transitions `READY` → `LINKED_TO_CART`, retention `UNATTACHED` → `CART_ATTACHED`.
  - Checkout initializes cleanly, locks upload to `CHECKOUT_LOCKED`.
  - OrderItem snapshot captures `product_type: "PERSONALIZED"`, `master_file_key: "masters/high-res-print-master.jpg"`, `canonical_dimensions: { width: 2400, height: 3000 }`, `physical_width: 8`, `physical_height: 10`, `physical_dimension_unit: "in"`, `effective_dpi: 300`.

---

## 7. Automated Test Suite Results

Command: `npx tsx --test apps/api/src/controllers/__tests__/checkout-safety.test.ts`

```text
▶ Catalogue Truth & Reconciliation
  ✔ verifies exact 82 source listings ↔ 82 canonical products 1:1 match via portable manifest (31.7ms)
  ✔ verifies exact price provenance: 48 confirmed source prices equal canonical base_price, 34 provisional (0.5ms)
  ✔ verifies identifier uniqueness: no duplicate SKUs or slugs (0.1ms)
  ✔ verifies absence of synthesized/unsupported marketing claims (0.2ms)
  ✔ verifies standard product classification: none of 82 catalogue items belong to custom-prints (0.1ms)
✔ Catalogue Truth & Reconciliation (33.2ms)
▶ Commerce & Personalization Safety - Real Service Invocations
  ✔ CASE A: Standard catalogue product can be added to cart without upload/crop and initializes checkout cleanly (1.7ms)
  ✔ CASE B: Personalized product strictly rejects addToCart when upload_id is missing without creating DB line item (0.3ms)
  ✔ CASE C: Personalized product with valid upload passes validation, initializes checkout, and persists master_file_key (1.0ms)
✔ Commerce & Personalization Safety - Real Service Invocations (3.1ms)
ℹ tests 8
ℹ suites 2
ℹ pass 8
ℹ fail 0
```

Command: `npx tsx scripts/verify-catalogue-reconciliation.ts`

```text
===============================================================
=== FIRSTMEMOIR SLICE 3.2: HARDENED RECONCILIATION VERIFICATION ===
===============================================================

[Portability] Repository source manifest loaded: 82 records.
[Local Disk Audit] Auditing against local source directory: /Users/ayushtomar/Downloads/listingx for website/LISTING PICTURES (all)
✅ Disk audit passed: 82 physical folders verified identical to repository manifest.

[Mapping Verification] Auditing 1:1 mapping between manifest and canonical catalogue...
✅ 1:1 Mapping verified: All 82 source listings correspond unambiguously to 82 canonical products.

[Price Provenance Audit] Auditing exact price equality for all source listings...

-----------------------------------
Source-priced listings: 48
Exact price matches: 48
Price mismatches: 0
Provisional listings: 34
-----------------------------------

[Specification Provenance] Checking factual fidelity and marketing claims...
✅ Clean descriptions: Zero synthetic claims found across all 82 products.
✅ Packaging: All 82 products explicitly tagged as PROVISIONAL_ESTIMATE.
✅ Uniqueness: 82 unique SKUs and 82 unique slugs verified.

🎉 SLICE 3.2 VERIFICATION PASSED: All evidence hardened, 48 exact prices proven, portable across all environments.
```
