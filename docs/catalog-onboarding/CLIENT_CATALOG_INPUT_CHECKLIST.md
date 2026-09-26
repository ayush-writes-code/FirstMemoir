# Client Catalog Input Checklist

*Authoritative Pre-Meeting Handoff Contract for FirstMemoir*
*Last updated: September 24, 2026*

This document outlines the exact business decisions, data values, platform access, and credentials required from the client.

Engineering has verified all local builds, database migration schemas, and dry-run ingestion pipelines. No catalog mutations or asset uploads will occur until the items below are resolved.

---

## 1. BUSINESS DECISIONS (Policy & Modeling)

### A. Product Structure & Grouping (8 Parent Groups)
The 82 source folders consist of **8 parent series (78 folders)** and **4 standalone listings**. The client must decide how each series should be represented in the catalog:
* **Option A (Product with Variants):** 1 Product with a dropdown/option selector on the PDP (e.g., 1 "Football Jerseys" product with 10 player options).
* **Option B (Collection of Products):** Distinct standalone Products shown separately in the Shop grid and grouped by Collection (e.g., 10 separate products in a "Football" category).

| # | Group Name | Leaf Folders | Content Summary | Client Decision Required |
|---|---|---|---|---|
| 1 | `Frames 8x12/F&F cars (8 variations)` | 8 | 8 Fast & Furious car frame designs (no metadata) | 1 Product w/ 8 Car Options **OR** 8 Products |
| 2 | `Frames 8x12/Football jerseys (10 variations)` | 10 | 10 Player jersey frames (Ronaldo, Messi, etc.) | 1 Product w/ 10 Player Options **OR** 10 Products |
| 3 | `Frames 8x12/Motivations Quotes (30 variations)` | 30 | 30 Motivational quote frame designs | 1 Product w/ 30 Quote Options **OR** 30 Products |
| 4 | `Posters/Anime (4 variations)` | 4 | 4 Pack sizes (10, 12, 20, 24 prints) | 1 Product w/ 4 Pack Options **OR** 4 Products |
| 5 | `Posters/Car split (7 variations)` | 7 | 7 Supercar 3-piece split poster sets | 1 Product w/ 7 Car Options **OR** 7 Products |
| 6 | `Posters/Ronaldo Split (6 variations)` | 6 | 6 Club 3-piece split poster sets | 1 Product w/ 6 Club Options **OR** 6 Products |
| 7 | `Posters/Split Anime (7 variations)` | 7 | 7 Anime character collage/split sets | 1 Product w/ 7 Character Options **OR** 7 Products |
| 8 | `Posters/bookmarks (3, 3 variations)` | 6 | 6 Bookmark packs (Animal, Quotes, Anime) | 1-2 Products w/ Options **OR** 6 Products |
| — | **Standalone Products** (4 items) | 4 | Porsche Frame, Car 8, Football 10, Wanted | Confirmed as 4 standalone Products |

### B. SKU Policy Approval
* **41 listings** have SKUs supplied in source files (30 Motivation Quotes, 7 Car Split, 1 Football 10, 3 Animal Bookmarks).
* **41 listings** have NO SKU in source data.
* **Decision:**
  - [ ] **Option 1 (Recommended):** Authorize engineering to auto-generate standard SKUs for missing items using pattern `FM-[CATEGORY]-[SLUG]` (e.g., `FM-FB-RONALDO-8X12`).
  - [ ] **Option 2:** Client will supply custom business SKUs for the 41 missing items.

### C. Brand & Source Asset Clearance
* **PosterNet Branding:** Source product images and infographics contain "PosterNet" logos, watermarks, and manufacturer details ("Rajput Traders").
  - [ ] Confirm whether "PosterNet" branding is legally cleared and authorized for FirstMemoir production use.
  - [ ] Confirm if replacement product photography will be supplied without third-party watermarks.
* **Commercial Rights:** Confirm commercial reproduction/sales rights for third-party IP (Anime, Automotive, Football clubs/players).

### D. Customizer / Mockup Policy (Clarification)
* **Forensic Finding:** All 82 supplied listings are **fixed-design, pre-printed catalog items**.
* **Confirmation:**
  - [ ] Confirm that none of the 82 items require dynamic photo customization (customer photo upload / canvas crop).
  - [ ] Confirm that dynamic mockup coordinates are NOT required for these items. (Mockup geometry is strictly reserved for custom photo products).

---

## 2. BUSINESS DATA (Values to Provide)

### A. Selling Prices for 34 Listings
* **48 listings** have verified consumer prices (1 x ₹249 for Porsche Frame, 47 x ₹299 for Frames/Posters).
* **20 listings** have internal placeholder instructions (`[Generate 150 rupees bank settlement]` or `[Generate 100 rupees bank settlement]`). The client must provide retail selling prices:
  1. `Posters/Anime (4 variations)` (4 pack listings: Anime 10, 12, 20, 24)
  2. `Posters/Car split (7 variations)` (7 car listings: Alfa Romeo, Lambo, Porsche, BMW...)
  3. `Posters/No category/Car 8` (1 poster listing)
  4. `Posters/No category/Wanted` (1 poster listing)
  5. `Posters/Split Anime (7 variations)/split monkey` (1 listing)
  6. `Posters/bookmarks (3, 3 variations)` (6 bookmark listings: BM Animal 1–3, BM 1, 3, 4)
* **14 listings** have NO price (folders completely lack `info.txt`):
  1. `Frames 8x12/F&F cars (8 variations)` (8 car designs: Camaro, Eclipse, Lancer, Mazda, S2000, Silvia, Skyline, Supra)
  2. `Posters/Split Anime (7 variations)` (6 character designs: split Eren, Levi, Light, ichigo, itachi, sasuke)

### B. Packaging Profiles (~4 Form Factors, NOT 82 Individual Boxes)
Packaging is governed by the physical form factor of the product, not individual SKUs. The client must supply packed box dimensions and dead weight for the **4 packaging profiles**:

| Profile # | Product Types Covered | Items | Packed Length (cm) | Packed Width (cm) | Packed Height (cm) | Packed Weight (kg) |
|---|---|---|---|---|---|---|
| **Profile 1** | Framed Prints 8x12 in (F&F, Football, Quotes, Porsche) | 49 | [ ] cm | [ ] cm | [ ] cm | [ ] kg |
| **Profile 2** | Split Poster 3-Pack 12x18 in (Car Split, Ronaldo Split) | 13 | [ ] cm | [ ] cm | [ ] cm | [ ] kg |
| **Profile 3** | Poster Packs 10–24 count (Anime mix, Car 8, Football 10, Wanted) | 14 | [ ] cm | [ ] cm | [ ] cm | [ ] kg |
| **Profile 4** | Bookmark Packs 10–15 count (Animal, Quotes, Anime) | 6 | [ ] cm | [ ] cm | [ ] cm | [ ] kg |

### C. Source Asset Clearance
* **Raw Source Asset Count:** 452 gallery images across the 82 folders (~5.5 images per product).
* **Action:** Client must review `docs/catalog-onboarding/R2_ASSET_MIGRATION_MANIFEST.md` and mark assets as `APPROVED_FOR_R2` or `DO_NOT_USE`.

---

## 3. PLATFORM ACCESS (Engineering Prerequisites)

| Platform | Purpose | Access Required | Status |
|---|---|---|---|
| **Render** | Deploy Express API & manage environment variables | Dashboard invite or Admin credentials | BLOCKED |
| **Vercel** | Deploy Storefront & bind production custom domain | Dashboard invite or Admin credentials | BLOCKED |
| **Cloudflare** | Provision production R2 bucket (e.g. `firstmemoir-assets`) with CORS | Cloudflare Dashboard access | BLOCKED |

---

## 4. LIVE CREDENTIALS (Secrets Management)

*Provide via secure channel; NEVER commit to Git:*
- [ ] **Razorpay Production:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- [ ] **Shiprocket Production:** Account Email, Account Password, and Registered Pickup Location ID
- [ ] **Neon Database:** Production PostgreSQL Connection String (if separate from staging)

---

## 5. ENGINEERING DEFECTS

* **Status:** **0 Engineering Defects.**
* All TypeScript checks, linter rules, Docker configurations, and monorepo builds are passing.
