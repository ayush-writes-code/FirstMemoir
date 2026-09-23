# Production Blockers

*Last updated: September 23, 2026*

This document tracks all blockers preventing the final FirstMemoir production launch. It strictly separates engineering blockers (which the development team can resolve) from business/client blockers (which require explicit answers from the client).

---

## 1. Client / Business Blockers
*These require explicit answers or sign-off before we can import the catalog and enable commerce.*

| Blocker | Description | Impact | Target Resolution |
|---|---|---|---|
| **Variant Grouping** | E.g. Are the 30 "Motivation Quotes" separate products or 1 product with 30 design options? Same for Anime packs, F&F cars, etc. | Cannot finalize DB schema ingestion. | Client Meeting |
| **Missing Prices** | 27 source folders have `[Generate XXX rupees]` or lack an `info.txt` file entirely. | Cannot enable Add to Cart or set product prices. | Client Meeting |
| **Packaging Rules** | No data on box dimensions (Width/Height/Depth) or packaging weight per product type. | Required for shipping calculation and Shiprocket integration. | Client Meeting |
| **SKU Policy** | A proposed SKU format (`FM-PEN-123`) was drafted. Need approval or the actual client SKU list. | Cannot reliably track inventory. | Client Meeting |
| **PosterNet Branding** | Source `info.txt` claims "PosterNet". Code checked EXIF/OCR and found no watermark, but visual sign-off is needed. | Blocks uploading all 452 images to production Cloudflare R2. | Client Meeting |

---

## 2. Engineering Blockers
*These are technical integration tasks that can be executed once business requirements or environment configurations are unblocked.*

| Blocker | Description | Dependency |
|---|---|---|
| **Cloudflare R2 CORS** | The Vercel domain `https://firstmemoir-storefront.vercel.app` is failing CORS against the R2 bucket. | Needs Cloudflare dashboard access to update CORS rules. |
| **Razorpay Production API** | Application needs live keys configured in the production environment. | Waiting on client's live business KYC/Razorpay account. |
| **Shiprocket Configuration** | Need to map packaging rules to API payloads. | Waiting on Packaging Rules (Business Blocker). |
| **Render API Deployment** | Production backend requires deployment and ENV population. | Needs final production DB URL and R2 variables. |
| **Catalog Database Import** | Execute the dry-run importer with mutations enabled. | Waiting on Variant Grouping & Prices (Business Blocker). |
| **R2 Asset Upload** | Bulk upload the 452 assets to R2 according to the manifest. | Waiting on PosterNet visual sign-off (Business Blocker). |
