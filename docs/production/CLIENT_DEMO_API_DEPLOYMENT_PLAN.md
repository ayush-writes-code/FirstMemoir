# Client Demo API Deployment Plan

*This document outlines the safe deployment strategy for the temporary client demo environment. It guarantees the protection of existing development infrastructure and prevents accidental exposure to production systems.*

> [!WARNING]
> **TEMPORARY DEMO ENVIRONMENT**
> This plan is strictly for deploying the current prototype to a temporary Vercel/Render pair for remote UI/UX evaluation. It is NOT the final production deployment.

---

## Dual Demo Surface

To allow the client to evaluate both the visual branding and the complex commerce engine without polluting the database with prototype data, the demo employs a strict dual-surface architecture.

### A. Visual Prototype Catalog
- **Source:** Hardcoded `PROTOTYPE_CATALOG` in `apps/storefront/src/lib/prototype-data.ts`.
- **Purpose:** Demonstrates visual branding, layouts, galleries, and editorial presentation using the client's supplied assets.
- **Dependency:** Storefront only. It intentionally bypasses the API, database, and cart. It renders a mock "Add to Cart" button that makes no network requests.
- **Constraint:** Prototype products (e.g., `prod-porsche`) **MUST NOT** be inserted into the Neon database.

### B. Real Commerce-Demo Product
- **Source:** The `family-portrait-frame` product, dynamically fetched via the API from the Neon Staging database (seeded via `seed.ts`).
- **Purpose:** Demonstrates the actual commerce engine: real options, pricing calculation, image upload, cropping, cart management, and checkout initialization.
- **UX Integration:** The product is fetched dynamically and prepended to the `/products` list with the suffix "(Interactive Demo)". Because its slug is absent from `PROTOTYPE_CATALOG`, the Storefront automatically falls back to rendering the real `<ProductCustomizer>` components.
- **Dependencies & Verification:**
  - **API/DB Dependency:** Requires the `family-portrait-frame` to exist in the Neon Staging database, complete with `ProductOption` and `ProductOptionValue` relations (Size, Frame, Glass, Paper) and `mockup_metadata`.
  - **Cart Dependency:** Requires the real `/api/v1/cart` endpoints to validate the selected options and crop parameters.
  - **Checkout Dependency:** Requires `/api/v1/checkout/initialize` to recalculate authoritative pricing based on DB records.
  - **Payment TEST Limitation:** Utilizes Razorpay TEST keys. It will successfully generate a Razorpay order and trigger the UI popup, but no live payment is possible.
  - **R2 Dependency:** Requires Vercel URL CORS whitelisting on the `weprintit-assets` bucket to support the image upload/crop feature during the customization flow.

---

## A. Current Architecture

- **Storefront (Vercel):** Next.js application running with `NEXT_PUBLIC_DEMO_MODE=true` to enable prototype catalog data.
- **API (Render):** Express.js backend providing cart validation, pricing computation, R2 upload signatures, and Razorpay order initialization.
- **Database:** Neon Staging PostgreSQL.
- **Storage:** Cloudflare R2 (`weprintit-assets`).
- **External Services:** Razorpay (Test Mode), Shiprocket (Dry Run).

---

## B. Required API Environment Variables

| Variable | Required? | Purpose | Demo Value Source | Secret? |
|---|---|---|---|---|
| `DATABASE_URL` | YES | Connect to PostgreSQL | Neon Staging DB | YES |
| `CORS_ORIGIN` | YES | Allow Storefront requests | Vercel Demo URL | NO |
| `TRUST_PROXY` | YES | Express rate limiting | `1` (for Render) | NO |
| `NODE_ENV` | YES | Execution context | `production` | NO |
| `JWT_ACCESS_SECRET` | YES | Auth token signing | Generate random string | YES |
| `JWT_REFRESH_SECRET` | YES | Auth token signing | Generate random string | YES |
| `COOKIE_SECRET` | YES | Cookie signing | Generate random string | YES |
| `RAZORPAY_KEY_ID` | YES | Razorpay Test API | Razorpay Dashboard (TEST) | NO |
| `RAZORPAY_KEY_SECRET` | YES | Razorpay Test API | Razorpay Dashboard (TEST) | YES |
| `RAZORPAY_WEBHOOK_SECRET` | YES | Validate webhooks | Razorpay Dashboard (TEST) | YES |
| `SHIPROCKET_DRY_RUN` | YES | Mock shipping API calls | `true` | NO |
| `R2_ACCOUNT_ID` | YES | Cloudflare API routing | Cloudflare Dashboard | NO |
| `R2_ACCESS_KEY_ID` | YES | S3 Upload permissions | Cloudflare API Token | YES |
| `R2_SECRET_ACCESS_KEY` | YES | S3 Upload permissions | Cloudflare API Token | YES |
| `R2_BUCKET_NAME` | YES | Target bucket | `weprintit-assets` | NO |
| `R2_PUBLIC_URL` | YES | Public access domain | R2 dev URL | NO |

---

## C. Database Safety Assessment

**Conclusion: SAFE. NO DB CHANGES REQUIRED.**

- **Migration Safety:** Safe. The `render.yaml` configuration uses `autoDeploy: false` and lacks a `preDeployCommand`. The `Dockerfile` does not run any Prisma migrations. No destructive `migrate reset` or `db push` will execute.
- **Data Integrity:** Safe. The demo API will only create new `Cart`, `Order`, and `UserUpload` records. It will not mutate existing staging data.
- **Prototype ↔ API Data Contract:** The previous assumption that the prototype catalog (e.g., `prod-porsche`) would crash the API cart is incorrect. 
  - Forensic trace confirms that prototype products rendered via `PROTOTYPE_CATALOG` in the storefront intentionally **bypass** the `<ProductCustomizer>` and API. 
  - They use `<PrototypeAddToCart>`, which simply mocks a success state without making any network requests.
  - Therefore, prototype products **do not need to exist in the database**.
- **Action Required:** To allow the client to test the actual end-to-end checkout flow, we rely on the existing, fully-configured development products (e.g., `family-portrait-frame`) created by `packages/database/prisma/seed.ts`. **Manual Verification:** Confirm that the existing Neon Staging DB contains these seed products. No new inserts are needed.

---

## D. Razorpay TEST Assessment

**Conclusion: SAFE (TEST MODE).**

- The `RazorpayService` securely initializes orders and verifies webhook signatures.
- By providing the Razorpay **TEST** keys, the API will communicate strictly with Razorpay's sandbox. No real payments will be processed.
- Webhooks require a public HTTPS endpoint. Once the Render API is live, its URL (`https://firstmemoir-api-xxxx.onrender.com/api/v1/webhooks/razorpay`) must be added to the Razorpay Test Dashboard to enable order status updates.

---

## E. Shiprocket DEV Assessment

**Conclusion: SAFE (DRY RUN).**

- Setting `SHIPROCKET_DRY_RUN=true` entirely short-circuits the `shiprocketService`.
- It will return mock tokens and mock AWB numbers without making any external HTTP calls.
- No real shipments will be created.

---

## F. R2 / Upload Safety

**Conclusion: SAFE (with explicit CORS configuration required).**

- **A. Object-key collision safety:** Safe. Keys utilize UUIDs and timestamps (`customers/172745345-abcd.webp`), preventing any overwriting of existing development assets in the `weprintit-assets` bucket.
- **B. Bucket access safety:** Safe. The API exclusively controls the credentials.
- **C. CORS safety:** **ACTION REQUIRED**. The R2 bucket likely defaults to permitting only `localhost` origins. Direct presigned uploads from the Vercel demo will fail with a 403 Forbidden error unless explicitly authorized.
- **D. Public-read behavior:** Safe. Customers' raw images are uploaded to the `customers/` prefix which remains private.
- **E. Exact CORS change required:** We must log in to the Cloudflare Dashboard for `weprintit-assets` and add the exact Vercel Demo URL (e.g., `https://firstmemoir-demo.vercel.app`) to the `AllowedOrigins` array, permitting `PUT`, `GET`, and `OPTIONS` with `AllowedHeaders: ["*"]`.
- **F. Development vs Production Isolation:** This CORS change affects only our internal development bucket. The final client production bucket does not exist yet.

---

## G. CORS Requirements

The expected flow requires exact origin matching:

1. **Vercel Demo URL** (e.g., `https://firstmemoir-demo.vercel.app`) must be injected into the API's `CORS_ORIGIN` environment variable.
2. **Vercel Demo URL** must be added to the Cloudflare R2 bucket CORS settings.
3. **Render API URL** must be injected into the Storefront's `NEXT_PUBLIC_API_URL` environment variable.

---

## H. Render Deployment Configuration

- **Render CLI** is not installed locally.
- Deployment **requires manual configuration** via the Render Dashboard.
- The `render.yaml` contract is valid and defines a Web Service utilizing Docker.

**Manual Render Checklist:**
- [ ] Connect repository: `ayush-writes-code/FirstMemoir`
- [ ] Select branch: `phase-3-2-categories`
- [ ] Root Directory: `/` (Empty)
- [ ] Environment: Docker
- [ ] Populate Environment Variables (from Section B)

---

## I. Exact Deployment Sequence

1. **Verify Database:** Check Neon Staging for prototype product IDs.
2. **Deploy API (Render):** Manually create the web service and retrieve the `onrender.com` URL.
3. **Configure Storefront (Vercel):** Deploy the `apps/storefront` directory with `NEXT_PUBLIC_API_URL` set to the Render URL and `NEXT_PUBLIC_DEMO_MODE=true`.
4. **Update CORS (API & R2):** Inject the final Vercel URL into the Render API `CORS_ORIGIN` and the Cloudflare R2 bucket CORS rules.
5. **Update Webhooks (Razorpay):** Add the Render API URL to the Razorpay Test Dashboard.

---

## J. Rollback / Cleanup Procedure

To dismantle the demo environment:
1. Delete the temporary Vercel project.
2. Suspend or delete the Render Web Service.
3. Remove the webhook endpoint from Razorpay Test Dashboard.
4. Remove the Vercel URL from the R2 CORS configuration.
5. (Optional) Purge the demo `customers/` folder in R2.
