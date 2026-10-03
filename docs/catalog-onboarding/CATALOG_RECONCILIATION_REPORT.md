# Catalogue Reconciliation & Commerce Safety Report (Slice 3.1)

*Authoritative Forensic Audit & Regression Verification*  
*Date: October 3, 2026*

---

## 1. Executive Summary

This report documents the forensic reconciliation and checkout safety verification performed between the 82 client-supplied source listing folders and the canonical FirstMemoir database catalogue dataset (`packages/database/prisma/catalogue/data.ts`).

### Key Audit Metrics

| Metric | Target | Actual Result | Verification Status |
|---|---|---|---|
| **Source Listings Audited** | 82 leaf folders | 82 leaf folders | `100% MATCH` |
| **Canonical Products Generated** | 82 products | 82 products | `100% MATCH` |
| **Direct 1:1 Matched Pairs** | 82 | 82 | `VERIFIED` |
| **Unmatched Source Folders** | 0 | 0 | `ZERO ERRORS` |
| **Extra / Unexplained Products** | 0 | 0 | `ZERO ERRORS` |
| **Duplicate Source Mappings** | 0 | 0 | `ZERO DUPLICATES` |
| **Duplicate Canonical Mappings** | 0 | 0 | `ZERO DUPLICATES` |
| **Source-Confirmed Selling Prices** | 48 | 48 | `VERIFIED` |
| **Provisional Estimated Selling Prices**| 34 | 34 | `VERIFIED` |
| **Globally Unique Deterministic SKUs** | 82 | 82 | `VERIFIED` |
| **Globally Unique Deterministic Slugs**| 82 | 82 | `VERIFIED` |

---

## 2. Forensic Identity Corrections Made

During forensic reconciliation against `/Users/ayushtomar/Downloads/listingx for website/LISTING PICTURES (all)`, the following critical discrepancy was discovered and corrected:

### Football Jersey Discrepancy
- **Issue**: The previous ingestion generator erroneously included `Messi` and `Suarez` as separate players, while omitting `Ramos` and `Zidane`. In reality, the folder named `pessi` in the source data contained `info.txt` titled `Lionel Messi Wall Poster Frames...`, while `Suarez` never existed in the source directory.
- **Correction**:
  - Folders verified: `Ronaldo`, `beckham`, `ibrahimovic`, `mbappe`, `neymar`, `pessi`, `ramos`, `ronaldinho`, `van dijk`, `zidane`.
  - Removed fictional listing `Suarez`.
  - Added verified listing `Sergio Ramos Jersey Frame` (SKU: `FM-FRM-FBL-RAMOS`).
  - Added verified listing `Zinedine Zidane Jersey Frame` (SKU: `FM-FRM-FBL-ZIDANE`).
  - Reconciled `pessi` directly to `Lionel Messi Jersey Frame` (SKU: `FM-FRM-FBL-MESSI`).

---

## 3. Removal of Synthesized & Unsupported Claims

All catalogue descriptions and metadata were audited to eliminate unconfirmed marketing claims and synthetic facts:

1. **Archival Paper & Moulding Claims**:
   - *Previous*: Claimed "Printed on 300 GSM archival paper with modern frame moulding" for F&F Cars.
   - *Correction*: F&F cars folder has no `info.txt`. Paper and frame moulding claims were completely removed and marked `UNKNOWN` / provisional.
2. **"Signed Jersey" Ambiguity**:
   - *Previous*: Claimed "signed jersey" (misleadingly implying autographed memorabilia).
   - *Correction*: Clarified as "Wall Poster Frame (8x12 inch) featuring [Player] World Cup special jersey artwork. Printed on 300 GSM photographic paper."
3. **Paper Specification Accuracy**:
   - *Previous*: Claimed "fine art paper" for Ronaldo split posters.
   - *Correction*: Reverted to source fact: "170 GSM photographic paper".
   - *Previous*: Claimed "coated cardstock" and "vibrant double-sided prints" for bookmarks.
   - *Correction*: Reverted to source fact: "300 GSM photographic paper".
   - *Previous*: Claimed "170 GSM photographic paper" across all 7 Split Anime folders.
   - *Correction*: 6 of the 7 Split Anime folders have no `info.txt`. Removed unconfirmed paper claims for the 6 missing listings.
4. **Bookmark Pack Quantities & Dimensions**:
   - Corrected BM-3 to 15 Pcs (Panda theme, 21x6 cm).
   - Corrected BM-4 to 12 Pcs (Anime theme, 15x5 cm).
   - Reconciled BM Animal 1–3 and BM-1 as 10 Pcs (21x6 cm).

---

## 4. Manufacturing & Packaging Metadata Review

In `packages/database/prisma/catalogue/data.ts`, packaging metadata is now segregated from confirmed product specifications:

```json
{
  "manufacturing_metadata": {
    "pricing_status": "CONFIRMED_SOURCE", // or "PROVISIONAL_ESTIMATE"
    "provisional_price": false,           // or true
    "source_mapping": {
      "source_folder": "Frames 8x12/Football jerseys (10 variations)/ramos",
      "has_source_info": true,
      "source_sku": null
    },
    "product_specs": {
      "paper": { "value": "300 GSM photographic paper", "status": "SOURCE_CONFIRMED" },
      "dimensions": { "value": "8x12 inch", "status": "SOURCE_CONFIRMED" },
      "raw_weight": { "value": "300g total", "status": "SOURCE_CONFIRMED" }
    },
    "provisional_packaging": {
      "profile": "Profile A",
      "status": "PROVISIONAL_ESTIMATE",
      "dimensions": { "length": 35, "width": 25, "height": 4, "unit": "cm" },
      "weight": { "value": 0.45, "unit": "kg" }
    }
  }
}
```

- All packaging dimensions (Profiles A, B, C, D) are explicitly marked `PROVISIONAL_ESTIMATE` to prevent treating them as measured courier billing facts.
- Unestablished fields (e.g., F&F car weight, unverified split anime specs) are marked `UNKNOWN` rather than fabricated.

---

## 5. Price Provenance Breakdown

- **48 Source-Confirmed Prices**:
  - Football jersey frames (10): ₹299
  - Motivation quote frames (30): ₹299
  - Porsche GT3 RS frame (1): ₹249
  - Football 10 posters (1): ₹299
  - Ronaldo split posters (6): ₹299
- **34 Provisional Engineering Estimates**:
  - Fast & Furious car frames (8): ₹299
  - Anime mix poster packs (4): ₹199, ₹249, ₹299, ₹349
  - Supercar split posters (7): ₹299
  - Split anime posters (7): ₹299
  - Bookmark packs (6): ₹149
  - Standalone poster sets (2: Car 8, Wanted 10): ₹249 each

---

## 6. Commerce & Checkout Safety Architecture

The cart and checkout pipelines were audited and reinforced to support two explicit product classes:

### Standard Products (All 82 Current Listings)
- **Cart Entry**: Standard products can enter the cart without requiring `upload_id`, `crop`, `orientation`, or `effective_dpi`.
- **Checkout Initialization**: Standard products initialize checkout without requiring user upload records, master asset files, or Size option physical dimensions.
- **Order Snapshot**: Immutable `OrderItem.customization_data` records `product_type: "STANDARD"`, `master_file_key: null`, with backend-authoritative pricing intact.

### Personalized Products (Future / Custom Photo Prints)
- **Cart Entry**: If a product has category `custom-prints` or requires personalization, `addToCart` strictly enforces `upload_id`, `preview_url`, `crop`, and `orientation`. Missing data immediately returns `400 Bad Request`.
- **Checkout Initialization**: Personalized items enforce valid upload asset (`masterFileKey`), DPI acknowledgment, and Size option physical dimensions.
- **Retention State Machine**: Atomic lock `CART_ATTACHED` → `CHECKOUT_LOCKED` executes across all referenced user uploads within the database transaction.

---

## 7. Automated Test Suite Results

Test file: `apps/api/src/controllers/__tests__/checkout-safety.test.ts`

```
▶ Catalogue Truth & Reconciliation
  ✔ verifies exact 82 source listings ↔ 82 canonical products 1:1 match
  ✔ verifies exact price provenance split: 48 confirmed, 34 provisional
  ✔ verifies identifier uniqueness: no duplicate SKUs or slugs
  ✔ verifies absence of synthesized/unsupported marketing claims
✔ Catalogue Truth & Reconciliation (23.78ms)
▶ Commerce & Personalization Safety Invariants
  ✔ standard product classification: none of 82 catalogue items belong to custom-prints
  ✔ verifies standard product addToCart does not require upload_id or crop
  ✔ verifies personalized product addToCart strictly rejects missing upload_id
  ✔ verifies checkout item snapshot distinguishes STANDARD vs PERSONALIZED
✔ Commerce & Personalization Safety Invariants (0.52ms)

8 tests passed, 0 failed.
```
