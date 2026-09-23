# Client Catalog Input Checklist

This checklist documents every business decision, approval, and data point required from the client to unblock catalog activation and remote deployment. 

**Engineering cannot proceed with data hydration until these inputs are finalized.**

---

## A. PRODUCT STRUCTURE
*Current Status: 78 folders have ambiguous variant structure.*

For every source listing/group, provide:
- [ ] **Final Product Name**: The customer-facing title.
- [ ] **Structure Classification**: Is this a standalone product, a design variant (e.g. 30 Motivation Quotes under 1 product), or a size variant?
- [ ] **Category & Collection**: E.g., "Posters", "Anime", "Motivational".
- [ ] **Canonical Slug**: URL-friendly identifier.

## B. SKU
*Current Status: 41 SKUs present, 41 SKUs missing.*

For every sellable product/variant, provide:
- [ ] **Canonical SKU**: The exact alphanumeric code used for inventory/tracking.
- [ ] **SKU Granularity**: Confirm whether SKUs are unique per Product, or unique per sellable option (e.g., `FRAME-A4-BLACK`).

## C. PRICING
*Current Status: 48 valid prices, 20 placeholder instructions ("Generate XXX rupees"), 14 entirely missing.*

For every sellable item, provide:
- [ ] **Selling Price**: The final cart price in INR.
- [ ] **MRP (Compare-at Price)**: If strikethrough pricing is desired.
- [ ] **Option Modifiers**: Cost difference for sizes, frame upgrades, etc.

## D. PHYSICAL PRODUCT DATA
*Current Status: Missing across the board for programmatic mapping.*

For every physical product, provide:
- [ ] **Finished Dimensions**: Width, Height, and Thickness of the actual item.
- [ ] **Material**: Description for the UI (e.g., 300 GSM photographic paper).

## E. PACKAGING / FULFILLMENT
*Current Status: 82/82 folders missing packaging data.*

For every actual fulfillment package, provide:
- [ ] **Packed Length (cm)**
- [ ] **Packed Width (cm)**
- [ ] **Packed Height (cm)**
- [ ] **Packed Weight (kg)**
- [ ] **Packaging Cardinality**: Confirm if packaging is keyed by Size, by Frame type, or both. (Required for Shiprocket shipping calculations).

## F. MOCKUPS
*Current Status: 82/82 folders missing explicit mockup geometry.*

For every product requiring user photo uploads or customization:
- [ ] **Base & Overlay Assets**: The transparent PNGs.
- [ ] **Print Area Geometry**: Exact X, Y, Width, and Height coordinates for the user's uploaded photo inside the frame.

## G. ASSET APPROVAL
*Current Status: 452 assets pending visual review.*

For each supplied source image:
- [ ] **Review Action**: Client must review the output of `R2_ASSET_MIGRATION_MANIFEST.md` and explicitly mark images as `APPROVED_FOR_R2` or `DO_NOT_USE`.

## H. BRANDING / SOURCE ASSET CLEARANCE
- [ ] **PosterNet Branding**: Confirm that any "PosterNet" watermarks or branding on the provided assets are legally cleared for FirstMemoir commercial use.
- [ ] **Commercial License**: Confirm that all supplied imagery (e.g., Anime, Cars, Football) is owned or licensed for reproduction.

## I. SHIPPING
- [ ] **Shiprocket Account Readiness**: Confirm the account is live.
- [ ] **Pickup Address Configuration**: Verify the primary pickup location ID in Shiprocket.

## J. PAYMENT
- [ ] **Razorpay Account Readiness**: Confirm KYC is complete and Live mode is active.
- [ ] **Production Credentials**: Securely supply Live Key ID, Live Key Secret, and Webhook Secret to the engineering team.
