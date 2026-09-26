# FirstMemoir — Client Meeting Package & Agenda

*Meeting Date: September 2026*  
*Prepared by: Engineering Team*  
*Document Version: 1.0 (Engineering Frozen Checkpoint `e2559d4`)*

---

## 1. Executive Summary & Objective

The engineering foundation for **FirstMemoir** is complete, locally verified, and frozen.

* **Storefront:** Editorial aesthetic (Naysha-inspired whitespace, typography, restrained navigation) paired with robust commerce flow (Zoomin-inspired category browsing, PDP gallery, cart, checkout).
* **Architecture:** Node/Express API with raw-body webhook security, non-destructive PostgreSQL/Prisma migrations, and isolated prototype data boundaries.
* **Catalog Status:** All 82 supplier listing folders and 452 gallery assets have been forensically crawled, audited, and mapped.

### Objective of this Meeting
To resolve **3 architectural business decisions**, collect **missing commercial pricing/packaging data**, and establish **platform access**. Once provided, the catalog importer will transition from dry-run validation to automated production database hydration.

---

## 2. Meeting Agenda (Estimated Duration: 40 Minutes)

1. **Storefront Architecture Demo (10 mins)**
   * Walkthrough of Home, Shop All, Category Navigation, and PDP gallery layouts.
   * Review of guest & authenticated checkout, cart pricing calculations, and order snapshot immutability.
2. **Catalog Modeling Decisions (10 mins)**
   * Structure choice for 8 product collections (Product with Variants vs. Distinct Products).
   * SKU naming policy approval.
3. **Asset Clearance & Brand Authorization (5 mins)**
   * Discussion of "PosterNet" watermarks/logos on supplied listing photography.
   * Intellectual property and commercial licensing sign-off.
4. **Data Intake Review (10 mins)**
   * Retail pricing for 34 listings (14 missing, 20 placeholder settlement targets).
   * Box dimensions and weights for 4 packaging form factors.
5. **Platform Access & Launch Timeline (5 mins)**
   * Handshake for Render, Vercel, Cloudflare, Razorpay, and Shiprocket credentials.
   * Post-meeting activation schedule.

---

## 3. The 3 Core Business Decisions

### Decision 1: Catalog Modeling & Grouping Policy
The source catalog provides 82 folders. 4 are standalone items, and 78 belong to **8 distinct series**. The client must select the presentation model for each series:

* **Model A (Single Product with Variant Picker):** 1 Product card on the shop grid. The customer clicks into the PDP and selects the design from a dropdown or visual swatch picker.
* **Model B (Collection of Distinct Products):** Every design appears as an individual product in the Shop grid, filterable by Collection.

| # | Series Name | Count | Description | Recommended Model | Client Selection |
|---|---|---|---|---|---|
| 1 | **Frames 8x12 / F&F Cars** | 8 | 8 Fast & Furious car frame designs | **Model B** (Individual products) | [ ] Model A &nbsp;&nbsp; [ ] Model B |
| 2 | **Frames 8x12 / Football Jerseys** | 10 | 10 Signed jersey frame designs (Ronaldo, Messi, etc.) | **Model B** (Individual products) | [ ] Model A &nbsp;&nbsp; [ ] Model B |
| 3 | **Frames 8x12 / Motivations Quotes** | 30 | 30 Motivational quote framed prints | **Model B** (Visual art collection) | [ ] Model A &nbsp;&nbsp; [ ] Model B |
| 4 | **Posters / Anime Packs** | 4 | Pack sizes: 10, 12, 20, 24 prints | **Model A** (Pack size selector) | [ ] Model A &nbsp;&nbsp; [ ] Model B |
| 5 | **Posters / Car Split** | 7 | 7 Supercar 3-piece split poster sets | **Model B** (Individual products) | [ ] Model A &nbsp;&nbsp; [ ] Model B |
| 6 | **Posters / Ronaldo Split** | 6 | 6 Club-themed 3-piece split poster sets | **Model B** (Individual products) | [ ] Model A &nbsp;&nbsp; [ ] Model B |
| 7 | **Posters / Split Anime** | 7 | 7 Anime character collage sets | **Model B** (Individual products) | [ ] Model A &nbsp;&nbsp; [ ] Model B |
| 8 | **Posters / Bookmarks** | 6 | 6 Bookmark packs (Animal, Quotes, Anime) | **Model A** (Theme selector) | [ ] Model A &nbsp;&nbsp; [ ] Model B |

---

### Decision 2: SKU Naming Policy
* **Current Status:** 41 listings contain supplier SKUs; 41 listings have no SKU.
* **Options:**
  - [ ] **Option 1 (Engineering Auto-Generation - Recommended):** Authorize engineering to generate consistent, human-readable SKUs for the 41 missing items using the convention: `FM-[CATEGORY]-[SLUG]` (e.g., `FM-FB-RONALDO-8X12`).
  - [ ] **Option 2 (Client-Provided SKUs):** Client will supply custom inventory codes for the 41 missing listings.

---

### Decision 3: Source Asset & Branding Clearance
The 452 listing images currently supplied contain third-party branding:
1. **"PosterNet" Watermarks:** Several infographics and product mockups display the name/logo of "PosterNet" and manufacturer "Rajput Traders".
   - [ ] **Clearance A:** Client authorizes displaying existing imagery as-is for the MVP launch.
   - [ ] **Clearance B:** Client will supply updated, unbranded photography or FirstMemoir-branded mockups.
2. **Commercial Rights:**
   - [ ] Client confirms rights to commercially reproduce and distribute the supplied artwork (Anime, Football Clubs, Automotive trademarks).

---

## 4. Business Data Intake Sheets

### Sheet 1: Retail Selling Prices (34 Items Required)
*Note: 48 listings already have verified retail prices (Porsche Frame @ ₹249; 47 Frames/Posters @ ₹299).*

#### Part A: Placeholder Settlement Listings (20 Items)
*The source data contains internal payout targets (`Generate 150/100 rupees bank settlement`). Please provide the customer-facing retail price:*

| # | Group / Folder Path | Source Target | Customer Selling Price (INR) | MRP / Compare-At (Optional) |
|---|---|---|---|---|
| 1 | `Posters/Anime/Anime 10` | 150 bank settlement | ₹ ________ | ₹ ________ |
| 2 | `Posters/Anime/Anime 12` | 150 bank settlement | ₹ ________ | ₹ ________ |
| 3 | `Posters/Anime/Anime 20` | 150 bank settlement | ₹ ________ | ₹ ________ |
| 4 | `Posters/Anime/Anime 24` | 150 bank settlement | ₹ ________ | ₹ ________ |
| 5 | `Posters/Car split/Alfa Romeo` | 150 bank settlement | ₹ ________ | ₹ ________ |
| 6 | `Posters/Car split/Orange Lambo` | 150 bank settlement | ₹ ________ | ₹ ________ |
| 7 | `Posters/Car split/cyan porche` | 150 bank settlement | ₹ ________ | ₹ ________ |
| 8 | `Posters/Car split/green lambo BAKC` | 150 bank settlement | ₹ ________ | ₹ ________ |
| 9 | `Posters/Car split/green lambo FRONT`| 150 bank settlement | ₹ ________ | ₹ ________ |
| 10| `Posters/Car split/grey BMW` | 150 bank settlement | ₹ ________ | ₹ ________ |
| 11| `Posters/Car split/pink lambo` | 150 bank settlement | ₹ ________ | ₹ ________ |
| 12| `Posters/No category/Car 8` | 150 bank settlement | ₹ ________ | ₹ ________ |
| 13| `Posters/No category/Wanted` | 150 bank settlement | ₹ ________ | ₹ ________ |
| 14| `Posters/Split Anime/split monkey` | 150 bank settlement | ₹ ________ | ₹ ________ |
| 15| `Posters/bookmarks/BM Animal 1` | 100 bank settlement | ₹ ________ | ₹ ________ |
| 16| `Posters/bookmarks/BM Animal 2` | 100 bank settlement | ₹ ________ | ₹ ________ |
| 17| `Posters/bookmarks/BM Animal 3` | 100 bank settlement | ₹ ________ | ₹ ________ |
| 18| `Posters/bookmarks/BM-1` | 100 bank settlement | ₹ ________ | ₹ ________ |
| 19| `Posters/bookmarks/BM-3` | 100 bank settlement | ₹ ________ | ₹ ________ |
| 20| `Posters/bookmarks/BM-4` | 100 bank settlement | ₹ ________ | ₹ ________ |

#### Part B: Unpriced Listings (14 Items - Missing info.txt)
*These folders contain gallery images but no metadata file. Please provide retail prices:*

| # | Group / Folder Path | Product Title / Description | Customer Selling Price (INR) |
|---|---|---|---|
| 1 | `Frames 8x12/F&F cars/Camaro` | Fast & Furious Camaro Framed Print | ₹ ________ |
| 2 | `Frames 8x12/F&F cars/Eclipse` | Fast & Furious Eclipse Framed Print | ₹ ________ |
| 3 | `Frames 8x12/F&F cars/Lancer` | Fast & Furious Lancer Framed Print | ₹ ________ |
| 4 | `Frames 8x12/F&F cars/Mazda` | Fast & Furious Mazda RX-7 Framed Print | ₹ ________ |
| 5 | `Frames 8x12/F&F cars/S2000` | Fast & Furious Honda S2000 Framed Print | ₹ ________ |
| 6 | `Frames 8x12/F&F cars/Silvia` | Fast & Furious Nissan Silvia Framed Print | ₹ ________ |
| 7 | `Frames 8x12/F&F cars/Skyline` | Fast & Furious Nissan Skyline Framed Print | ₹ ________ |
| 8 | `Frames 8x12/F&F cars/Supra` | Fast & Furious Toyota Supra Framed Print | ₹ ________ |
| 9 | `Posters/Split Anime/split Eren` | Attack on Titan Eren Split Poster Set | ₹ ________ |
| 10| `Posters/Split Anime/split Levi` | Attack on Titan Levi Split Poster Set | ₹ ________ |
| 11| `Posters/Split Anime/split Light` | Death Note Light Split Poster Set | ₹ ________ |
| 12| `Posters/Split Anime/split ichigo` | Bleach Ichigo Split Poster Set | ₹ ________ |
| 13| `Posters/Split Anime/split itachi` | Naruto Itachi Split Poster Set | ₹ ________ |
| 14| `Posters/Split Anime/split sasuke` | Naruto Sasuke Split Poster Set | ₹ ________ |

---

### Sheet 2: Packaging & Shipping Profiles (4 Form Factors)
*Shiprocket calculates domestic freight based on volumetric weight (`L × W × H / 5000`) and dead weight. You only need to define box measurements for the 4 physical form factors:*

| Profile | Items Covered | Example Product | Box Length (cm) | Box Width (cm) | Box Height (cm) | Packed Weight (kg) |
|---|---|---|---|---|---|---|
| **Profile 1: Framed Prints** | 49 | 8×12 in Framed Posters (Quotes, Jerseys, F&F) | [ &nbsp;&nbsp;&nbsp;&nbsp; ] | [ &nbsp;&nbsp;&nbsp;&nbsp; ] | [ &nbsp;&nbsp;&nbsp;&nbsp; ] | [ &nbsp;&nbsp;&nbsp;&nbsp; ] |
| **Profile 2: Split Poster Packs**| 13 | 3-Piece 12×18 in Wall Split Sets (Car, Ronaldo) | [ &nbsp;&nbsp;&nbsp;&nbsp; ] | [ &nbsp;&nbsp;&nbsp;&nbsp; ] | [ &nbsp;&nbsp;&nbsp;&nbsp; ] | [ &nbsp;&nbsp;&nbsp;&nbsp; ] |
| **Profile 3: Poster Multipacks** | 14 | 10–24 Count Unframed Print Packs (Anime, Car 8) | [ &nbsp;&nbsp;&nbsp;&nbsp; ] | [ &nbsp;&nbsp;&nbsp;&nbsp; ] | [ &nbsp;&nbsp;&nbsp;&nbsp; ] | [ &nbsp;&nbsp;&nbsp;&nbsp; ] |
| **Profile 4: Bookmark Sets** | 6 | 10–15 Count Cardstock Bookmarks | [ &nbsp;&nbsp;&nbsp;&nbsp; ] | [ &nbsp;&nbsp;&nbsp;&nbsp; ] | [ &nbsp;&nbsp;&nbsp;&nbsp; ] | [ &nbsp;&nbsp;&nbsp;&nbsp; ] |

---

## 5. Platform Access & Live Credentials Checklist

To execute the deployment immediately after data sign-off, engineering requires access to the following hosting and commerce dashboards:

| Provider | Purpose | Delivery Method | Checklist |
|---|---|---|---|
| **Render** | Deploy Node/Express API service | Dashboard Team Invite or Admin Login | [ ] Invited |
| **Vercel** | Deploy Next.js Storefront & attach custom domain | Team Member Invite or Admin Login | [ ] Invited |
| **Cloudflare** | Provision production R2 bucket (`firstmemoir-assets`) with CORS | Dashboard Access or API Token | [ ] Configured / Shared |
| **Razorpay** | Production payment gateway integration | API Keys via 1Password / Secure Vault | [ ] `KEY_ID` & `KEY_SECRET` <br>[ ] `WEBHOOK_SECRET` |
| **Shiprocket** | Live AWB courier generation & tracking | Account Credentials via Secure Vault | [ ] Account Login <br>[ ] Pickup Location ID |

---

## 6. Post-Meeting Launch Sequence

Once the decisions, data sheets, and access are completed during the meeting, engineering will follow this deterministic execution path:

```
[Client Data Received]
        │
        ▼
1. Validate Inputs Against Data Contract
        │
        ▼
2. Dry-Run Ingestion Verification (npm run import:dry-run)
        │
        ▼
3. Execute Database Mutation (npm run import -- --apply)
        │
        ▼
4. Upload Cleared Assets to Cloudflare R2
        │
        ▼
5. Populate Render & Vercel Production Environment Secrets
        │
        ▼
6. Remote Smoke Test & Live Rupee 1 Test Transaction
        │
        ▼
7. PUBLIC GO-LIVE
```
