# FirstMemoir — Client Catalogue Clarifications

*Authoritative Clarification Package for Client Catalogue Review*  
*Last updated: October 3, 2026*

---

## 1. Confirmed Decisions (Resolved — No Client Action Required)

The following items have been resolved and confirmed. Engineering has incorporated them into the catalogue architecture. **The client does NOT need to answer or take action on these items:**

| Area | Decision Made | Rationale / Resolution |
|---|---|---|
| **Product Grouping & Architecture** | **Separate Products** | Grouped designs (e.g. Football Jerseys, Motivational Quotes, Car Splits, F&F Cars) will each be treated as **individual, standalone products** with their own dedicated Product Detail Pages (PDPs), organized under shared, common categories and collections. They will not be collapsed into complex multi-attribute dropdown variants. |
| **SKU Policy** | **Automated Engineering Generation** | Engineering will automatically assign deterministic, standardized SKUs (format: `FM-[CAT]-[SLUG]`) to the 41 listings that currently lack SKUs. These SKUs will remain fully editable by the client later in the admin panel. The client is **not** asked to create or supply 41 manual SKUs. |
| **Brand Ownership (PosterNet)** | **Client-Owned Brand Confirmed** | The client has confirmed that "PosterNet" is their own brand. Engineering will **not** flag PosterNet watermarks or logos as blockers, will not request brand clearance, and will not request replacement photography. |
| **Third-Party / IP Assets** | **Accepted for Current Scope** | Product artwork depicting anime, football clubs/players, and automotive brands is accepted as supplied for the current milestone. No legal clearance or replacement photography is requested. |
| **Packaging Dimensions** | **Provisional Estimates Assigned** | Catalogue onboarding will **not** be blocked waiting for exact physical box measurements. Engineering has assigned provisional packaging estimates across 4 standard profiles. These remain fully editable in the admin system and will only require exact physical measurement before live shipping rates are activated with Shiprocket. |

---

## 2. What Engineering Will Handle Automatically

Engineering will proceed with the following actions without burdening the client:
1. **Deterministic SKU Generation:** Auto-assign unique SKUs to the 41 missing listings using the `FM-[CATEGORY]-[SLUG]` schema.
2. **Metadata Normalization:** Clean up titles, descriptions, and category taxonomy across all 82 listings.
3. **Asset Mapping:** Map all 452 high-resolution gallery images to their respective products.
4. **Provisional Packaging Mapping:** Map each product to one of the 4 standard packaging profiles for initial dry-run validation.

---

## 3. What We Need From the Client

We require client confirmation on **only two items**:
1. **Catalogue Structure Confirmation:** A simple confirmation of the product layout model (Section 4).
2. **Selling Prices for 34 Listings:** Providing the customer-facing retail price (INR) for 34 listings currently lacking explicit prices (Section 5).

> [!NOTE]
> We do **NOT** ask about SKUs, PosterNet, IP, database schema, R2 storage, APIs, payment gateways, shipping integrations, or server hosting. Those remain internal engineering responsibilities.

---

## 4. Catalogue Structure Confirmation

Please confirm the following structure for how products will appear on the website:

> **"Each design/listing will appear as an individual product, while related products will be organized under common/similar categories."**

- [ ] **CONFIRMED** — Yes, proceed with individual product listings organized by category.
- [ ] **REVISE** — *(Provide notes if a different customer browsing structure is desired)*: ___________________________

---

## 5. 34-Product Price Clarification Table

### Catalogue Pricing Reconciliation
- **Total Leaf Listings Audited:** 82
- **Listings with Explicit Verified Prices:** 48 *(47 @ ₹299, 1 @ ₹249)*
- **Listings with Placeholder Price Instructions:** 20 *(14 @ ₹150 bank settlement, 6 @ ₹100 bank settlement)*
- **Listings with Missing Price (No `info.txt`):** 14
- **Total Listings Needing Client Price Confirmation:** **34** *(20 Placeholder + 14 Missing)*

Please provide the customer-facing retail selling price in INR for each of the 34 listings below:

### Group 1: Frames 8×12 — Fast & Furious Cars (8 Listings)
*Parent Folder: `Frames 8x12/F&F cars (8 variations)/`*  
*Physical Format: 8×12 inch framed art print*

| # | Product / Listing Name | Current Source Folder | Current Price State | Client Confirmed Selling Price (₹) |
|---|---|---|---|---|
| 1 | Camaro | `Frames 8x12/F&F cars (8 variations)/Camaro` | MISSING | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 2 | Eclipse | `Frames 8x12/F&F cars (8 variations)/Eclipse` | MISSING | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 3 | Lancer | `Frames 8x12/F&F cars (8 variations)/Lancer` | MISSING | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 4 | Mazda | `Frames 8x12/F&F cars (8 variations)/Mazda` | MISSING | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 5 | S2000 | `Frames 8x12/F&F cars (8 variations)/S2000` | MISSING | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 6 | Silvia | `Frames 8x12/F&F cars (8 variations)/Silvia` | MISSING | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 7 | Skyline | `Frames 8x12/F&F cars (8 variations)/Skyline` | MISSING | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 8 | Supra | `Frames 8x12/F&F cars (8 variations)/Supra` | MISSING | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |

---

### Group 2: Posters — Anime Mix Packs (4 Listings)
*Parent Folder: `Posters/Anime (4 variations)/`*  
*Physical Format: Unframed poster packs (10–24 prints, A4 / 6×9 / 12×4.5 in)*

| # | Product / Listing Name | Current Source Folder | Current Price State | Client Confirmed Selling Price (₹) |
|---|---|---|---|---|
| 9 | Anime Universe: Anime poster Set of 10 Mix Anime Wall Posters for Room Size A4 Fine Art Print (12 inch X 9 inch, Unframed) | `Posters/Anime (4 variations)/Anime 10` | PLACEHOLDER ₹150 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 10 | Anime Universe: Anime poster Set of 12 Mix Anime Wall Posters for Room Fine Art Print (12 inch X 4.5 inch, Unframed) | `Posters/Anime (4 variations)/Anime 12` | PLACEHOLDER ₹150 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 11 | Anime Universe: Set of 24 Stunning 6x9 Inch Prints on 300 GSM Paper - Featuring Naruto, One Piece, Jujutsu Kaisen, Demon Slayer, Chainsaw, and More! Paper Print (9 inch X 6 inch) | `Posters/Anime (4 variations)/Anime 24` | PLACEHOLDER ₹150 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 12 | Set of 20 mix anime wall poster different anime posters for room \| size_11.9x8.3 inch A4 Size \| 300 GSM Glossy paper Paper Print (8.3 inch X 11.9 inch, Box) | `Posters/Anime (4 variations)/anime 20` | PLACEHOLDER ₹150 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |

---

### Group 3: Posters — Supercar Split Posters (7 Listings)
*Parent Folder: `Posters/Car split (7 variations)/`*  
*Physical Format: 3-piece 12×18 inch split poster sets*

| # | Product / Listing Name | Current Source Folder | Current Price State | Client Confirmed Selling Price (₹) |
|---|---|---|---|---|
| 13 | Pack of 3 - Alfa Romeo Super Car Split Poster Set, 12 inch x 18 inch, Split Design Wall Decor Posters For Bedroom, Living Room, Office | `Posters/Car split (7 variations)/Alfa Romeo` | PLACEHOLDER ₹150 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 14 | Pack of 3 - Lamborghini Super Car Split Poster Set, 12 inch x 18 inch, Split Design Wall Decor Posters For Bedroom, Living Room, Office | `Posters/Car split (7 variations)/Orange Lambo` | PLACEHOLDER ₹150 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 15 | Pack of 3 - Porsche Super Car Split Poster Set, 12 inch x 18 inch, Split Design Wall Decor Posters For Bedroom, Living Room, Office | `Posters/Car split (7 variations)/cyan porche` | PLACEHOLDER ₹150 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 16 | Pack of 3 - Lamborghini Super Car Split Poster Set, 12 inch x 18 inch, Split Design Wall Decor Posters For Bedroom, Living Room, Office | `Posters/Car split (7 variations)/green lambo BAKC` | PLACEHOLDER ₹150 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 17 | Pack of 3 - Lamborghini Hurican Super Car Split Poster Set, 12 inch x 18 inch, Split Design Wall Decor Posters For Bedroom, Living Room, Office | `Posters/Car split (7 variations)/green lambo FRONT` | PLACEHOLDER ₹150 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 18 | Pack of 3 - BMW M4 Car Split Poster Set, 12 inch x 18 inch, Split Design Wall Decor Posters For Bedroom, Living Room, Office | `Posters/Car split (7 variations)/grey BMW` | PLACEHOLDER ₹150 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 19 | Pack of 3 - Lamborghini Super Car Split Poster Set, 12 inch x 18 inch, Split Design Wall Decor Posters For Bedroom, Living Room, Office | `Posters/Car split (7 variations)/pink lambo` | PLACEHOLDER ₹150 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |

---

### Group 4: Posters — Anime Character Split & Collage (7 Listings)
*Parent Folder: `Posters/Split Anime (7 variations)/`*  
*Physical Format: Unframed character prints and wall collage sets*

| # | Product / Listing Name | Current Source Folder | Current Price State | Client Confirmed Selling Price (₹) |
|---|---|---|---|---|
| 20 | split Eren | `Posters/Split Anime (7 variations)/split Eren` | MISSING | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 21 | split Levi | `Posters/Split Anime (7 variations)/split Levi` | MISSING | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 22 | split Light | `Posters/Split Anime (7 variations)/split Light` | MISSING | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 23 | split ichigo | `Posters/Split Anime (7 variations)/split ichigo` | MISSING | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 24 | split itachi | `Posters/Split Anime (7 variations)/split itachi` | MISSING | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 25 | set of 20 manga wall collage kit of onepiece luffy gear 5 collage kit Paper Print (8.3 inch X 11.8 inch) | `Posters/Split Anime (7 variations)/split monkey` | PLACEHOLDER ₹150 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 26 | split sasuke | `Posters/Split Anime (7 variations)/split sasuke` | MISSING | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |

---

### Group 5: Posters — Standalone Poster Sets (2 Listings)
*Parent Folder: `Posters/No category/`*  
*Note: Football 10 in this folder has verified price ₹299 and is excluded from this table.*

| # | Product / Listing Name | Current Source Folder | Current Price State | Client Confirmed Selling Price (₹) |
|---|---|---|---|---|
| 27 | Car Posters Set of 8 A4 Size - Car posters for wall Boys room - Super car poster - Porsche poster, BMW poster - Car wallpaper - Gifting ideas for men boys - Cars gift - Car Wall Art - Car stickers for wall | `Posters/No category/Car 8` | PLACEHOLDER ₹150 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 28 | Pack Of 10 One Piece straw hat pirates wanted poster Luffy Gear 5 Size 8X10 inch Anime Poster Fine Art Print (10 inch X 8 inch) | `Posters/No category/Wanted` | PLACEHOLDER ₹150 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |

---

### Group 6: Bookmarks — Bookmark Sets (6 Listings)
*Parent Folder: `Posters/bookmarks (3, 3 variations)/`*  
*Physical Format: Sets of 10–15 bookmarks (21×6 cm / 15×5 cm)*

| # | Product / Listing Name | Current Source Folder | Current Price State | Client Confirmed Selling Price (₹) |
|---|---|---|---|---|
| 29 | Bookmarks For Animal Lovers - Set Of 10 Pcs - 21cm x 6cm - Designed Animal Themed Printed Bookmark | `Posters/bookmarks (3, 3 variations)/BM Animal 1` | PLACEHOLDER ₹100 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 30 | Bookmarks For Animal Lovers - Set Of 10 Pcs - 21cm x 6cm - Designed Animal Themed Printed Bookmark | `Posters/bookmarks (3, 3 variations)/BM Animal 2` | PLACEHOLDER ₹100 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 31 | Bookmarks For Animal Lovers - Set Of 10 Pcs - 21cm x 6cm - Designed Animal Themed Printed Bookmark | `Posters/bookmarks (3, 3 variations)/BM Animal 3` | PLACEHOLDER ₹100 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 32 | Bookmarks For Book Lovers Set Of 10 Pcs Designed Quotes Theme Printed Bookmark Bookmark Bookmark (Quotes, Multicolor) | `Posters/bookmarks (3, 3 variations)/BM-1` | PLACEHOLDER ₹100 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 33 | Bookmarks For Book Lovers Set Of 15 Pcs Designed Panda Theme Printed Quotes Bookmark Bookmark (Quotes, Multicolor) | `Posters/bookmarks (3, 3 variations)/BM-3` | PLACEHOLDER ₹100 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |
| 34 | Bookmarks For Anime Lovers Set Of 12 Pcs Specially Designed Theme Bookmark (Anime, Multicolor) | `Posters/bookmarks (3, 3 variations)/BM-4` | PLACEHOLDER ₹100 | ₹ [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] |

---

## 6. Provisional Packaging Estimates (Internal Engineering Note)

> [!IMPORTANT]
> **STATUS: ESTIMATE / PROVISIONAL (INTERNAL USE ONLY)**  
> These dimensions and weights are calculated engineering estimates derived from product types and source file specifications. They exist solely to unblock catalogue onboarding and initial database staging. They are **NOT** client-confirmed measurements.
> 
> All values are fully editable through the admin panel and **MUST** be measured and updated with physical packaging samples before live shipping rates and courier pickups are activated on Shiprocket.

| Profile | Profile Name | Target Products Covered | Total Items | Est. Length (L) | Est. Width (W) | Est. Height (H) | Est. Packed Weight | Unit | Derivation Basis & Rationale |
|---|---|---|---|---|---|---|---|---|---|
| **Profile A** | 8×12 Framed Wall Art | F&F Cars (8), Football Jerseys (10), Quotes (30), Porsche (1) | 49 | 35.0 cm | 25.0 cm | 4.0 cm | 450 g (0.45 kg) | cm / g | 8×12 inch print is 20.3 × 30.5 cm. Adding 2.5–3 cm perimeter for moulding + corrugated edge-protection box. Raw print/frame weight in `info.txt` is 250–300g; ~150g added for box and bubble wrap. |
| **Profile B** | 3-Piece 12×18 Split Poster Set | Supercar Splits (7), Ronaldo Splits (6) | 13 | 48.0 cm | 10.0 cm | 10.0 cm | 250 g (0.25 kg) | cm / g | 12×18 inch prints (30.5 × 45.7 cm) shipped rolled in rigid postal tube/triangular box (or 48×33×2 cm flat mailer). Raw print weight in `info.txt` is 150g; ~100g added for mailing tube/box. |
| **Profile C** | Poster Packs (10–24 Count) | Anime Packs (4), Car 8 (1), Football 10 (1), Wanted (1), Split Anime (7) | 14 | 32.0 cm | 24.0 cm | 2.5 cm | 300 g (0.30 kg) | cm / g | Sized for standard A4 (21.0 × 29.7 cm) or 6×9 inch prints in rigid flat envelope/stay-flat cardboard box. Raw print weight in `info.txt` is 150–250g; ~50–100g added for rigid packaging. |
| **Profile D** | Bookmark Packs (10–15 Count) | Bookmark sets (Animal, Quotes, Anime) | 6 | 23.0 cm | 8.0 cm | 2.0 cm | 120 g (0.12 kg) | cm / g | Sized for 21×6 cm and 15×5 cm bookmarks in small protective sleeve/bubble mailer. Raw weight in `info.txt` is 100g; ~20g added for envelope/sleeve. |

---

## 7. What Must Be Confirmed Before Final Catalogue Import

To proceed from staging preview to final database import:
1. **Client Price Confirmation:** Completion of the retail prices for the 34 listings in Section 5.
2. **Catalogue Structure Confirmation:** Client sign-off on Section 4.
3. *(Prior to Live Fulfillment only)*: Physical measurement validation of the 4 packaging profiles in Section 6.
