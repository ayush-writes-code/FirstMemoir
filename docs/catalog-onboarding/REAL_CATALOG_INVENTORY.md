# Real Catalog Inventory

*Source: `/Users/ayushtomar/Downloads/listingx for website/LISTING PICTURES (all)/`*
*Forensic analysis date: September 23, 2026*

## Verified Counts

| Metric | Count | Notes |
|---|---|---|
| Total image/asset files | 452 | Excluding .DS_Store and info.txt |
| Total info.txt files | 68 | Containing product metadata |
| Total leaf folders | 82 | Lowest-level folders containing images |
| Folders WITH info.txt | 68 | Have at least partial metadata |
| Folders WITHOUT info.txt | 14 | F&F cars (8) + Split Anime (6) |
| Verified selling prices | 48 | ₹249 (1), ₹299 (47) |
| Placeholder selling prices | 13 | "[Generate XXX rupees bank settlement]" |
| No price data at all | 14 | Folders with no info.txt |
| Folders with SKUs | 41 | Motivation frames (30), Car split (7), Animal bookmarks (3), Football poster (1) |
| Folders without SKUs | 41 | |

### File Count Reconciliation
* **Forensic Audit Count**: 82 leaf folders.
* **Dry-Run Script Count**: Initially reported 80 because it treated `Posters/No category` as a single leaf folder, missing its 3 subfolders (`Car 8`, `Football 10`, `Wanted`).
* **Resolution**: The `dry-run-importer.ts` script was updated to properly recurse into `No category`. The official leaf folder count is confirmed as **82**.

## Classification Summary

> [!IMPORTANT]
> "82 leaf folders" does NOT mean "82 unique products."
> Many folders represent design variants within a single collection.
> The actual product count depends on business decisions about variant modeling.

| Classification | Count | Description |
|---|---|---|
| PRODUCT (standalone) | 4 | Porsche frame, Car 8 poster set, Football 10 poster set, One Piece Wanted set |
| PRODUCT (distinct variant — different specs) | 4 | Anime 10/12/20/24 (different pack sizes, prices, dimensions) |
| DESIGN (variant of a collection — same specs) | 67 | Football players (10), Motivation quotes (30), Car splits (7), Ronaldo splits (6), Split Anime (7), Bookmarks (7) |
| ASSET GROUP (no metadata, parent folder inferred) | 8 | F&F cars (8 car folders with NO info.txt) |
| AMBIGUOUS | 0 | All classified above, though business decisions needed on modeling |

**Estimated sellable unit range:** 12–82 depending on whether design variants become separate Products or Options.

---

## Top-Level Source Structure

```
Frames 8x12/                          (4 groups, 49 leaf folders)
├── F&F cars (8 variations)/           8 car designs, NO info.txt
├── Football jerseys (10 variations)/  10 player designs, each with info.txt
├── Motivations Quotes (30 variations)/ 30 quote designs, each with info.txt + SKU
└── Porsche frame listing pics/        1 standalone product

Posters/                               (6 groups, 33 leaf folders)
├── Anime (4 variations)/              4 pack-size variants with info.txt
├── Car split (7 variations)/          7 car designs with info.txt + SKU ID
├── Ronaldo Split (6 variations)/      6 club designs with info.txt
├── Split Anime (7 variations)/        7 character designs, only 1 has info.txt
├── bookmarks (3, 3 variations)/       7 bookmark designs with info.txt
└── No category/                       3 standalone products
    ├── Car 8/
    ├── Football 10 listings pics/
    └── Wanted/
```

---

## Product Type Distribution (from info.txt)

| Product Type | Count | Source |
|---|---|---|
| Motivational Posters (framed) | 30 | Frames 8x12 |
| Football Frames | 10 | Frames 8x12 |
| Bookmarks | 6 | Posters/bookmarks |
| Posters (Ronaldo split) | 6 | Posters/Ronaldo Split |
| Anime mix (unframed) | 4 | Posters/Anime |
| Car Posters | 1 | Posters/No category/Car 8 |
| Football Posters | 1 | Posters/No category/Football 10 |
| Anime Poster (Split) | 1 | Posters/Split Anime/split monkey |
| Anime Poster | 1 | Posters/No category/Wanted |
| Poster Frames | 1 | Frames 8x12/Porsche |

---

## Price Distribution

| Selling Price | Count | Notes |
|---|---|---|
| ₹299 | 47 | Most common verified price |
| ₹249 | 1 | Porsche frame only |
| `[Generate 150 rupees bank settlement]` | 7 | Car split, Anime mix, Wanted, Car 8 |
| `[Generate 100 rupees bank settlement]` | 6 | Bookmarks (BM-1 through BM-4) |
| NO DATA | 14 | Folders with no info.txt |

## MRP Distribution

| MRP | Count |
|---|---|
| ₹899 | 32 |
| ₹999 | 17 |
| ₹599 | 9 |
| ₹499 | 6 |
| ₹799 | 3 |
| ₹699 | 1 |

## Dimensions Distribution

| Dimensions | Count | Category |
|---|---|---|
| 8×12 inch, 290g, 5cm height | 30 | Motivation frames |
| 8×12 inch, 300g, 2cm height | 10 | Football frames |
| 12×18 inch, 150g, roll package | 6 | Ronaldo split posters |
| 12"×18", 150g, 2cm height | 7 | Car split posters |
| 21cm×6cm, 100g, 2cm | 5 | Bookmarks |
| A4, 200g, 2cm | 3 | Anime mix, Car 8 |
| 15cm×5cm, 100g, 2cm | 1 | Anime bookmarks |
| 8×12 inch, 250g, 4cm | 1 | Porsche frame |
| Other variations | 5 | Mixed Anime packs |

## Paper Types

| Paper | Count |
|---|---|
| 300 GSM photographic paper | 55 |
| 170 GSM photographic paper | 6 |
| (unknown — no info.txt) | 14 |

## Image Characteristics

- Most images: 4688×4688px square JPEGs (marketplace product photography)
- Some Anime images: ~1240×1664px
- These are **listing photographs**, NOT print-ready source files
- These are NOT mockup scene composites

## Critical Missing Data

1. **14 folders have NO info.txt at all** — no title, price, SKU, dimensions, weight
2. **13 folders have placeholder prices** — internal instructions, not real selling prices
3. **41 folders have NO SKU**
4. **All folders list brand as "PosterNet"** — not "FirstMemoir"
5. **No personalization products** exist in the supplied data
6. **No custom photo print products** exist in the supplied data
