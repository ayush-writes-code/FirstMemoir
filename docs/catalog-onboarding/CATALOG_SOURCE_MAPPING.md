# Catalog Source Mapping

*Maps each source folder from the client's listing data to the FirstMemoir product schema.*

> [!NOTE]
> Source: `/Users/ayushtomar/Downloads/listingx for website/LISTING PICTURES (all)/`
>
> This document was generated from forensic analysis of every info.txt and folder in the client-supplied listing data.
> Fields marked MISSING or BUSINESS DECISION REQUIRED must not be invented.

---

## Classification Legend

| Status | Meaning |
|---|---|
| DIRECT FIT | Existing schema handles this without changes |
| CONFIGURATION REQUIRED | Schema supports it; real values must be entered |
| MISSING DATA | Source does not provide this information |
| BUSINESS DECISION REQUIRED | Ambiguous structure requiring client confirmation |

---

## Prototype Data Boundary

Due to the pending business decisions regarding variant grouping and pricing, the application currently implements a **Strict Prototype Data Boundary**:

- **No DB Pollution**: Ambiguous source folders have *not* been imported into the Prisma database.
- **UI-Facing Model**: The storefront operates on a polymorphic `StorefrontProduct` type which standardizes both API (`ProductDto`) and static prototype data.
- **Prototype Catalog**: A subset of 10 verified items (representing frames, posters, and bookmarks) is hardcoded in `lib/prototype-data.ts` to unblock UI/UX development (Shop Page, PDP).
- **Cart Isolation**: Prototype products utilize a distinct `<PrototypeAddToCart />` component to prevent broken cart transactions against the actual production database.

**Real-Data Migration Path**:
Once the business approves the variant structures, pricing, and packaging dimensions, the ingest scripts will populate the DB. The `prototype-data.ts` fallback inside `app/products/page.tsx` and `app/products/[slug]/page.tsx` will be deleted, and all products will natively route through `productsApi.getProducts()`.

---

## A. Source / Inventory Taxonomy

How the client supplied the files:

```
LISTING PICTURES (all)/
├── Frames 8x12/
│   ├── F&F cars (8 variations)/       → 8 car design folders, NO info.txt
│   ├── Football jerseys (10 variations)/ → 10 player folders, each with info.txt
│   ├── Motivations Quotes (30 variations)/ → 30 design folders, each with info.txt + SKU
│   └── Porsche frame listing pics/    → 1 folder with info.txt
└── Posters/
    ├── Anime (4 variations)/          → 4 pack-size folders (10/12/20/24), each with info.txt
    ├── Car split (7 variations)/      → 7 car design folders, each with info.txt + SKU ID
    ├── Ronaldo Split (6 variations)/  → 6 club/team folders, each with info.txt
    ├── Split Anime (7 variations)/    → 7 character folders, 1 has info.txt, 6 do NOT
    ├── bookmarks (3, 3 variations)/   → 7 bookmark design folders, each with info.txt
    └── No category/                   → 3 uncategorized folders (Car 8, Football 10, Wanted)
```

---

## B. Product Data Taxonomy

How listings are represented in the database:

> [!NOTE]
> **CONFIRMED DECISION**: All grouped designs are modeled as **SEPARATE PRODUCTS** organized under shared/similar categories and collections, each with its own dedicated Product Detail Page (PDP). They will not be collapsed into multi-variant dropdowns.

| # | Source Group | Classification | Count | DB Structure | Status |
|---|---|---|---|---|---|
| 1 | F&F cars (8 variations) | Individual car designs in collection | 8 products | 8 separate Products | CONFIRMED: Separate Products (prices missing) |
| 2 | Football jerseys (10 variations) | Individual player designs in collection | 10 products | 10 separate Products | DIRECT FIT (₹299 verified) |
| 3 | Motivations Quotes (30 variations) | Individual quote designs in collection | 30 products | 30 separate Products | DIRECT FIT (₹299 verified + SKUs present) |
| 4 | Porsche frame listing pics | Standalone product | 1 product | 1 Product | DIRECT FIT (₹249 verified) |
| 5 | Anime (4 variations) | Individual pack size products | 4 products | 4 separate Products | CONFIRMED: Separate Products (placeholder price) |
| 6 | Car split (7 variations) | Individual car 3-piece split sets | 7 products | 7 separate Products | CONFIRMED: Separate Products (placeholder price) |
| 7 | Ronaldo Split (6 variations) | Individual club 3-piece split sets | 6 products | 6 separate Products | DIRECT FIT (₹299 verified) |
| 8 | Split Anime (7 variations) | Individual character sets | 7 products | 7 separate Products | CONFIRMED: Separate Products (prices missing/placeholder) |
| 9 | bookmarks (3, 3 variations) | Individual bookmark packs | 6 products | 6 separate Products | CONFIRMED: Separate Products (placeholder price) |
| 10 | No category / Car 8 | Standalone poster set | 1 product | 1 Product | CONFIRMED: Separate Product (placeholder price) |
| 11 | No category / Football 10 | Standalone poster set | 1 product | 1 Product | DIRECT FIT (₹299 verified) |
| 12 | No category / Wanted | Standalone poster set | 1 product | 1 Product | CONFIRMED: Separate Product (placeholder price) |

**Total distinct sellable Products:** **82 Products** (all 82 leaf listings are individual products).


---

## C. Customer-Facing Information Architecture

How shoppers should browse the website:

```
FirstMemoir.in
├── Shop All
├── Wall Frames (8×12 Framed Prints)
│   ├── Football Legends
│   ├── Motivational Quotes
│   ├── Cars & Supercars
│   └── Porsche GT3 RS
├── Posters & Wall Art
│   ├── Anime Collections
│   ├── Split Design Posters
│   ├── Football Posters
│   └── Car Posters
├── Bookmarks
│   ├── Animal Theme
│   ├── Anime Theme
│   ├── Panda / Quotes Theme
│   └── Mixed Theme
└── Custom Photo Prints (personalization)
    └── [Future — upload your own photo]
```

> [!IMPORTANT]
> The "Custom Photo Prints" category exists in the existing codebase architecture but has NO entries in the client's listing data. It should remain as a future capability, not removed.

---

## D. Detailed Source-to-Schema Mapping

### Group 1: Frames 8×12 — F&F Cars (8 designs)

| Field | Value | Status |
|---|---|---|
| Source folder | `Frames 8x12/F&F cars (8 variations)/[Camaro,Eclipse,Lancer,Mazda,S2000,Silvia,Skyline,Supra]` | — |
| Source title | MISSING (no info.txt in any subfolder) | MISSING DATA |
| Classification | DESIGN variants — 8 car designs, same product type | BUSINESS DECISION REQUIRED |
| Proposed Category | Wall Frames | CONFIGURATION REQUIRED |
| Proposed Collection | Cars & Supercars | CONFIGURATION REQUIRED |
| Price | MISSING | MISSING DATA |
| MRP | MISSING | MISSING DATA |
| SKU | MISSING | MISSING DATA |
| Dimensions | MISSING (inferred: 8×12 inch from parent folder name) | MISSING DATA |
| Weight | MISSING | MISSING DATA |
| Packaging | MISSING | MISSING DATA |
| Images | 5 per design (1.jpg–5.jpg), 4688×4688px each | DIRECT FIT |
| Personalization required? | No — pre-designed art | DIRECT FIT |
| Mockup required? | No | DIRECT FIT |
| Missing information | info.txt, price, SKU, dimensions, weight, title | MISSING DATA |
| Business decision required | Whether each car is a separate Product or a design option on 1 Product | BUSINESS DECISION REQUIRED |

### Group 2: Frames 8×12 — Football Jerseys (10 designs)

| Field | Value | Status |
|---|---|---|
| Source folder | `Frames 8x12/Football jerseys (10 variations)/[Ronaldo,beckham,ibrahimovic,mbappe,messi,neymar,pessi,ronaldinho,suarez,van dijk]` | — |
| Source title | `[Player] Wall Poster Frames \| 8x12 inch \| World Cup special signed Jerseys Series` | VERIFIED FROM SOURCE |
| Classification | DESIGN variants — 10 player designs, identical product type/price/dimensions | BUSINESS DECISION REQUIRED |
| Proposed Category | Wall Frames | CONFIGURATION REQUIRED |
| Proposed Collection | Football Legends | CONFIGURATION REQUIRED |
| Price | ₹299 | VERIFIED FROM SOURCE |
| MRP | ₹999 | VERIFIED FROM SOURCE |
| SKU | MISSING (only Football_10 appears in the "No category" football poster) | MISSING DATA |
| Dimensions | 8 inch × 12 inch | VERIFIED FROM SOURCE |
| Weight | 300g total | VERIFIED FROM SOURCE |
| Packaging height | 2 cm | VERIFIED FROM SOURCE |
| Paper | 300 GSM photographic paper | VERIFIED FROM SOURCE |
| Images | 6 per design (1.jpg–6.jpg), ~4688×4688px | DIRECT FIT |
| Personalization required? | No | DIRECT FIT |
| Mockup required? | No | DIRECT FIT |
| Missing information | Individual SKUs | MISSING DATA |
| Business decision required | Whether each player is a separate Product or a design option | BUSINESS DECISION REQUIRED |

### Group 3: Frames 8×12 — Motivational Quotes (30 designs)

| Field | Value | Status |
|---|---|---|
| Source folder | `Frames 8x12/Motivations Quotes (30 variations)/Motivation quits (1)–(30)` | — |
| Source title | `Wall Framed Posters \| 8x12 inch size \| Motivational Quotes Posters` | VERIFIED FROM SOURCE |
| Classification | DESIGN variants — 30 unique quote designs, identical product specs | BUSINESS DECISION REQUIRED |
| Proposed Category | Wall Frames | CONFIGURATION REQUIRED |
| Proposed Collection | Motivational Quotes | CONFIGURATION REQUIRED |
| Price | ₹299 | VERIFIED FROM SOURCE |
| MRP | ₹899 | VERIFIED FROM SOURCE |
| SKU | Motivation_frame_01 through Motivation_frame_30 | VERIFIED FROM SOURCE |
| Dimensions | 8×12 inch | VERIFIED FROM SOURCE |
| Weight | 290g total | VERIFIED FROM SOURCE |
| Packaging height | 5 cm | VERIFIED FROM SOURCE |
| Paper | 300 GSM photographic paper | VERIFIED FROM SOURCE |
| Images | 5 per design (1.jpg–5.jpg) | DIRECT FIT |
| Personalization required? | No | DIRECT FIT |
| Mockup required? | No | DIRECT FIT |
| Missing information | None — most complete group | — |
| Business decision required | Whether each quote is a separate Product or a design option | BUSINESS DECISION REQUIRED |

### Group 4: Frames 8×12 — Porsche GT3 RS

| Field | Value | Status |
|---|---|---|
| Source folder | `Frames 8x12/Porsche frame listing pics/` | — |
| Source title | `Set of 3 - Porsche GT3 RS Wall Poster Frame \| 8x12 inch (A4 Size)` | VERIFIED FROM SOURCE |
| Classification | PRODUCT (single, standalone) | DIRECT FIT |
| Proposed Category | Wall Frames | CONFIGURATION REQUIRED |
| Price | ₹249 | VERIFIED FROM SOURCE |
| MRP | ₹999 | VERIFIED FROM SOURCE |
| SKU | MISSING | MISSING DATA |
| Dimensions | 8 inch × 12 inch | VERIFIED FROM SOURCE |
| Weight | 250g total | VERIFIED FROM SOURCE |
| Packaging height | 4 cm | VERIFIED FROM SOURCE |
| Paper | 300 GSM photographic paper | VERIFIED FROM SOURCE |
| Images | Present | DIRECT FIT |
| Personalization required? | No | DIRECT FIT |
| Missing information | SKU | MISSING DATA |

### Group 5: Posters — Anime Mix (4 pack sizes)

| Field | Value | Status |
|---|---|---|
| Source folder | `Posters/Anime (4 variations)/[Anime 10, Anime 12, anime 20, Anime 24]` | — |
| Source title | Varies per pack size (e.g., "Anime poster Set of 10 Mix") | VERIFIED FROM SOURCE |
| Classification | PRODUCT variants — 4 different products with different pack sizes, prices, and dimensions | DIRECT FIT |
| Proposed Category | Posters & Wall Art | CONFIGURATION REQUIRED |
| Proposed Collection | Anime Collections | CONFIGURATION REQUIRED |
| Price | `[Generate 150 rupees bank settlement]` — NOT a real price | MISSING DATA |
| MRP | ₹599–₹799 (varies by pack size) | VERIFIED FROM SOURCE |
| SKU | MISSING | MISSING DATA |
| Dimensions | Varies: A4, 12×4.5 inch, 9×6 inch | VERIFIED FROM SOURCE |
| Weight | 150g–250g | VERIFIED FROM SOURCE |
| Paper | 300 GSM photographic paper | VERIFIED FROM SOURCE |
| Images | 3–5 per variant | DIRECT FIT |
| Personalization required? | No | DIRECT FIT |
| Missing information | Actual selling price, SKU | MISSING DATA |
| Business decision required | Are these 4 separate products or 1 product with a "Pack Size" option? | BUSINESS DECISION REQUIRED |

### Group 6: Posters — Car Split (7 designs)

| Field | Value | Status |
|---|---|---|
| Source folder | `Posters/Car split (7 variations)/[Alfa Romeo, Orange Lambo, cyan porche, green lambo BAKC, green lambo FRONT, grey BMW, pink lambo]` | — |
| Source title | `Pack of 3 - [Car] Super Car Split Poster Set, 12 inch × 18 inch` | VERIFIED FROM SOURCE |
| Classification | DESIGN variants — 7 car designs, same format | BUSINESS DECISION REQUIRED |
| Proposed Category | Posters & Wall Art | CONFIGURATION REQUIRED |
| Proposed Collection | Split Design Posters | CONFIGURATION REQUIRED |
| Price | `[Generate 150 rupees bank settlement]` — NOT a real price | MISSING DATA |
| MRP | ₹599 | VERIFIED FROM SOURCE |
| SKU | Present (e.g., AlfaRomeo_car, Pink lambo_car) | VERIFIED FROM SOURCE |
| Dimensions | 12 inch × 18 inch | VERIFIED FROM SOURCE |
| Weight | 150g total | VERIFIED FROM SOURCE |
| Paper | 170 GSM photographic paper | VERIFIED FROM SOURCE |
| Images | 3–5 per design | DIRECT FIT |
| Personalization required? | No | DIRECT FIT |
| Missing information | Actual selling price | MISSING DATA |

### Group 7: Posters — Ronaldo Split (6 club designs)

| Field | Value | Status |
|---|---|---|
| Source folder | `Posters/Ronaldo Split (6 variations)/[Al Nassr, Juventus, Manchester Utd, Portugal, Real Madrid, Sporting Lisbon]` | — |
| Source title | `Set of 3 - Cristiano Ronaldo Split Design Posters \| Full Size (36 × 18 inch) \| [Club]` | VERIFIED FROM SOURCE |
| Classification | DESIGN variants — 6 club variations of same player split poster | BUSINESS DECISION REQUIRED |
| Proposed Category | Posters & Wall Art | CONFIGURATION REQUIRED |
| Proposed Collection | Split Design Posters | CONFIGURATION REQUIRED |
| Price | ₹299 | VERIFIED FROM SOURCE |
| MRP | ₹999 | VERIFIED FROM SOURCE |
| SKU | MISSING | MISSING DATA |
| Dimensions | 12 inch × 18 inch | VERIFIED FROM SOURCE |
| Weight | 150g total | VERIFIED FROM SOURCE |
| Paper | 170 GSM photographic paper | VERIFIED FROM SOURCE |
| Images | 6 per design (1.jpg–6.jpg) | DIRECT FIT |
| Personalization required? | No | DIRECT FIT |
| Missing information | SKU | MISSING DATA |

### Group 8: Posters — Split Anime (7 character designs)

| Field | Value | Status |
|---|---|---|
| Source folder | `Posters/Split Anime (7 variations)/[split Eren, split Levi, split Light, split ichigo, split itachi, split monkey, split sasuke]` | — |
| Source title | Only 1 info.txt found (split monkey): `set of 20 manga wall collage kit of onepiece luffy gear 5` | MISSING DATA (6 of 7) |
| Classification | DESIGN variants — 7 anime character split designs | BUSINESS DECISION REQUIRED |
| Proposed Category | Posters & Wall Art | CONFIGURATION REQUIRED |
| Proposed Collection | Split Design Posters / Anime | CONFIGURATION REQUIRED |
| Price | `[Generate 150 rupees bank settlement]` (from the 1 info.txt) | MISSING DATA |
| MRP | ₹899 (from the 1 info.txt) | PARTIALLY VERIFIED |
| SKU | MISSING | MISSING DATA |
| Dimensions | A4 (from the 1 info.txt) | PARTIALLY VERIFIED |
| Weight | 300g (from the 1 info.txt) | PARTIALLY VERIFIED |
| Images | 3–5 per design (mixed filenames, some with design-tool naming) | DIRECT FIT |
| Personalization required? | No | DIRECT FIT |
| Missing information | 6 of 7 designs have NO info.txt, no price, no SKU, no dimensions | MISSING DATA |

### Group 9: Posters — Bookmarks (7 designs)

| Field | Value | Status |
|---|---|---|
| Source folder | `Posters/bookmarks (3, 3 variations)/[BM-1, BM-3, BM-4, BM Animal 1, BM Animal 2, BM Animal 3]` | — |
| Source title | Varies: "Bookmarks For Book Lovers", "Bookmarks For Anime Lovers", "Animal Bookmarks" | VERIFIED FROM SOURCE |
| Classification | PRODUCT (each is a distinct bookmark set with different theme/design) | DIRECT FIT |
| Proposed Category | Bookmarks | CONFIGURATION REQUIRED |
| Price | `[Generate 100 rupees bank settlement]` — NOT a real price | MISSING DATA |
| MRP | ₹499 | VERIFIED FROM SOURCE |
| SKU | Present for Animal variants (AnimalBM1/2/3), MISSING for others | PARTIALLY VERIFIED |
| Dimensions | 15cm×5cm or 21cm×6cm | VERIFIED FROM SOURCE |
| Weight | 100g total | VERIFIED FROM SOURCE |
| Packaging height | 2 cm | VERIFIED FROM SOURCE |
| Paper | 300 GSM photographic paper | VERIFIED FROM SOURCE |
| Images | 3–5 per design | DIRECT FIT |
| Personalization required? | No | DIRECT FIT |
| Missing information | Actual selling price, some SKUs | MISSING DATA |

### Group 10: No category — Car Posters Set of 8

| Field | Value | Status |
|---|---|---|
| Source folder | `Posters/No category/Car 8/` | — |
| Source title | `Car Posters Set of 8 A4 Size - Car posters for wall Boys room` | VERIFIED FROM SOURCE |
| Classification | PRODUCT (single) | DIRECT FIT |
| Proposed Category | Posters & Wall Art | CONFIGURATION REQUIRED |
| Price | `[Generate 150 rupees bank settlement]` | MISSING DATA |
| MRP | ₹599 | VERIFIED FROM SOURCE |
| SKU | MISSING | MISSING DATA |
| Dimensions | A4 | VERIFIED FROM SOURCE |
| Weight | 200g total | VERIFIED FROM SOURCE |
| Images | 5 listing images | DIRECT FIT |

### Group 11: No category — Football 10 Posters

| Field | Value | Status |
|---|---|---|
| Source folder | `Posters/No category/Football 10 listings pics/` | — |
| Source title | `Set of 10 football Wall Posters \| A4 size` | VERIFIED FROM SOURCE |
| Classification | PRODUCT (single) | DIRECT FIT |
| Proposed Category | Posters & Wall Art | CONFIGURATION REQUIRED |
| Price | ₹299 | VERIFIED FROM SOURCE |
| MRP | ₹799 | VERIFIED FROM SOURCE |
| SKU | Football_10 | VERIFIED FROM SOURCE |
| Dimensions | A4 | VERIFIED FROM SOURCE |
| Weight | 210g total | VERIFIED FROM SOURCE |
| Images | 6 listing images | DIRECT FIT |

### Group 12: No category — One Piece Wanted Posters

| Field | Value | Status |
|---|---|---|
| Source folder | `Posters/No category/Wanted/` | — |
| Source title | `Pack Of 10 One Piece straw hat pirates wanted poster Luffy Gear 5 Size 8X10 inch` | VERIFIED FROM SOURCE |
| Classification | PRODUCT (single) | DIRECT FIT |
| Proposed Category | Posters & Wall Art / Anime | CONFIGURATION REQUIRED |
| Price | `[Generate 150 rupees bank settlement]` | MISSING DATA |
| MRP | ₹899 | VERIFIED FROM SOURCE |
| SKU | MISSING | MISSING DATA |
| Dimensions | A4 | VERIFIED FROM SOURCE |
| Weight | 200g total | VERIFIED FROM SOURCE |
| Images | 4 listing images | DIRECT FIT |

---

## E. Critical Observations

### Selling Price Problem

13 of 68 info.txt files contain `[Generate XXX rupees bank settlement]` instead of an actual selling price. This appears to be an internal instruction to the listing platform, NOT a real price. These products have **NO verified selling price**.

- 47 listings have verified selling price: ₹299
- 1 listing has verified selling price: ₹249
- 7 listings say `[Generate 150 rupees bank settlement]`
- 6 listings say `[Generate 100 rupees bank settlement]`
- 14 folders have NO info.txt at all (F&F cars: 8, Split Anime: 6)

### MRP / Compare-at-Price

Every info.txt contains an MRP field. MRP values: ₹499, ₹599, ₹699, ₹799, ₹899, ₹999. This is clearly used for strikethrough pricing on marketplaces (Flipkart). Whether FirstMemoir should display MRP is a **BUSINESS DECISION REQUIRED**.

### SKU Coverage

- 30 Motivation frames have SKUs (Motivation_frame_01–30)
- 7 Car split designs have SKU IDs
- 3 Animal bookmarks have SKU IDs
- 1 Football poster set has a SKU
- **41 out of 82 folders have SKUs; 41 do not**
- **CONFIRMED RESOLUTION**: Engineering will generate deterministic, standardized SKUs (`FM-[CAT]-[SLUG]`) for the 41 missing items. All SKUs remain editable via admin. Client is not required to provide manual SKUs.

### Personalization

NONE of the supplied listings require photo upload or personalization. They are all pre-designed, fixed-art products. The existing personalization architecture remains valuable for future "custom photo print" products but is NOT needed for the current supplied catalog.

### Image Quality

Most listing images are 4688×4688px square JPEGs (marketplace product photography). Some Anime/Split images are smaller (1240×1664px). These are marketplace listing images, NOT print-ready source files and NOT mockup scene composites.

### Brand Name

All info.txt files list brand name as "PosterNet".
- **CONFIRMED RESOLUTION**: The client confirmed that "PosterNet" is their own brand. PosterNet watermarks and branding are approved as-is for FirstMemoir production assets. No replacement assets or legal clearance required.

### Manufacturer

All listings cite "Rajput Traders" as both manufacturer and importer.
