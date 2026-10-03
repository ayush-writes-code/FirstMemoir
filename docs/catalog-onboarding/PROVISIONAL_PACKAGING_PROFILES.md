# Provisional Packaging Profiles

*Internal Engineering Document — Not for Client Distribution*  
*Last updated: October 3, 2026*

> [!WARNING]
> **STATUS: PROVISIONAL / ESTIMATE**  
> These dimensions and weights are provisional engineering estimates based on source catalogue descriptions and physical format categories.  
> **Replace with measured packed dimensions and actual packed weight before production shipping-rate configuration.**  
> Do **NOT** calculate live Shiprocket production courier rates or book actual carrier pickups from these estimates.

---

## 1. Overview and Purpose

To prevent blocking catalogue ingestion and database staging while awaiting physical box measurements, products are mapped to one of **4 provisional packaging profiles**.

These values are preliminary engineering placeholders to allow database schemas and staging APIs to function. They will remain fully editable in the Admin Panel once physical packaging samples are measured.

---

## 2. Provisional Profiles Summary

| Profile | Profile Description | Listings Covered | Count | Provisional Est. Dimensions (L × W × H) | Provisional Est. Packed Weight | Unit | Packaging State & Validation Notes |
|---|---|---|---|---|---|---|---|
| **Profile A** | 8×12 Framed Wall Art | Fast & Furious Cars (8), Football Jerseys (10), Motivation Quotes (30), Porsche Frame (1) | 49 | 35 × 25 × 4 cm | 450 g (0.45 kg) | cm / g | **Provisional Estimate**. Derived from 8×12 in (20.3 × 30.5 cm) print size + 2–5 cm frame moulding/box margin. Source files cite 250–300g raw product weight; packaging allowance adds ~150g. |
| **Profile B** | 3-Piece 12×18 Split Poster Set | Supercar Splits (7), Cristiano Ronaldo Splits (6) | 13 | *Unvalidated Geometry* (See note below) | 250 g (0.25 kg) | cm / g | **Provisional Estimate**. Physical shipping format is unvalidated: prints may ship rolled in a mailing tube (~48 × 10 × 10 cm) or flat in a stay-flat box (~48 × 33 × 2 cm). Raw prints are 150g (170 GSM); ~100g packaging allowance added. Actual dimensions must be measured from physical packaging. |
| **Profile C** | Poster Packs (10–24 Count) | Anime Packs (4), Car 8 (1), Football 10 (1), Wanted (1), Split Anime (7) | 14 | 32 × 24 × 2.5 cm | 300 g (0.30 kg) | cm / g | **Provisional Estimate**. Sized for flat-packed A4 (21.0 × 29.7 cm) or 6×9 in prints in a rigid stay-flat mailer or shallow box. Source files cite 150–250g raw print weight; ~50–100g packaging allowance added. |
| **Profile D** | Bookmark Packs (10–15 Count) | Bookmark sets (Animal, Quotes, Anime) | 6 | 23 × 8 × 2 cm | 120 g (0.12 kg) | cm / g | **Provisional Estimate**. Sized for 21×6 cm and 15×5 cm bookmarks in a padded envelope or small sleeve. Source files cite 100g raw weight; ~20g mailer allowance added. |

**Total Listings Covered:** **82 listings** (49 + 13 + 14 + 6 = 82)

---

## 3. Physical Validation Requirements Prior to Live Shipping

Before switching Shiprocket from dry-run mode (`SHIPROCKET_DRY_RUN=true`) to live production:
1. Physical samples of all 4 packaging types must be packed with real contents and cushioning.
2. An engineer or fulfillment operator must measure:
   - Length (cm, outer edge to outer edge)
   - Width (cm, outer edge to outer edge)
   - Height (cm, outer edge to outer edge)
   - Dead weight on a calibrated digital scale (kg, to two decimal places)
3. The verified values must be updated in the database / Admin configuration.
4. Volumetric weight formulas (`(L × W × H) / 5000`) must be reconciled against carrier billing tiers.
