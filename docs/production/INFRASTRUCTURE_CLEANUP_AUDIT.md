# FirstMemoir — Infrastructure Cleanup & Pre-Account Audit

*Audit Date: September 24, 2026*  
*Author: Engineering Team*  
*Status: Pre-Migration Audit (No Destructive Actions Taken)*

---

## 1. Executive Summary

This document performs a forensic audit of all infrastructure, cloud providers, external accounts, environment variables, and legacy references in the FirstMemoir codebase.

The goal is to prepare for a clean, deterministic transfer of ownership to **fresh client-controlled accounts** across:
- **GitHub** (Client organization repository)
- **Vercel** (Storefront hosting & custom domain)
- **Render** (API web service & container hosting)
- **Cloudflare** (R2 object storage & CDN routing)
- **Razorpay** (Live payment gateway & webhooks)
- **Shiprocket** (Domestic logistics & AWB tracking)

> [!IMPORTANT]
> **THIS IS NOT A RESET.**
> No Git history, database schemas, Neon data, R2 objects, or code abstractions are deleted. The codebase retains full local functionality while cleanly decoupling from legacy development accounts.

---

## 2. Infrastructure Inventory & Cleanup Matrix

| Resource | Current Owner/Location | Current State | Old Reference | Preserve? | Cleanup Action |
|---|---|---|---|---|---|
| **GitHub Repository** | `ayush-writes-code/FirstMemoir` | Active origin remote; contains all branches and history | `https://github.com/ayush-writes-code/FirstMemoir.git` | **YES** | Add new client remote (e.g. `client` or replace `origin`) when client GitHub is ready; push all branches. Do NOT delete existing repo. |
| **Vercel Project** | Team `team_7KNdhTyKbzmdYvn7jRqzvcq9` | Project `prj_uWYEPSY69cr3YgB9Ht483yH1E3lU` (`firstmemoir-storefront`) | `.vercel/project.json`, root `.env.local` (`VERCEL_OIDC_TOKEN`) | **PRESERVE FOR REFERENCE** | Keep until client Vercel project is created. Then remove local `.vercel/` folder and run `npx vercel link` to new project. |
| **Render API Service** | Staging / Personal account (Singapore region) | Specified in `render.yaml` (`firstmemoir-api`), no live remote verified | `render.yaml`, docs reference `https://firstmemoir-api.onrender.com` | **PRESERVE `render.yaml`** | Align `render.yaml` env keys with `env.ts`. When client creates Render account, link new GitHub repo and create Web Service from blueprint. |
| **Cloudflare R2 Bucket** | Account `694b7628005c133e000f815f81d91640` | Bucket `weprintit-assets`, public endpoint `pub-cbf2a823886f4d379eba3abf625d08ac.r2.dev` | `apps/api/.env`, `apps/storefront/next.config.js` | **PRESERVE EXISTING BUCKET** | Do NOT delete `weprintit-assets`. Client creates new bucket (e.g. `firstmemoir-assets`) in client Cloudflare account, sets CORS, attaches custom domain, and supplies fresh keys. |
| **Neon PostgreSQL DB** | Project `ep-wispy-glitter-axsmkbyo` | Isolated staging DB with Prisma migrations applied | Referenced in `CURRENT_STATE.md` | **PRESERVE** | Do NOT drop or reset. Client decides whether to adopt current Neon DB or create a fresh client-owned Neon project. |
| **Local Docker DB** | `localhost:54320/test_db` | Container running alpine PostgreSQL, passes 119/119 tests | `docker-compose.test.yml`, `scripts/test-setup.sh` | **YES** | Retain for all local development and CI testing. Zero remote exposure. |
| **Razorpay Gateway** | Development test mode account | Tested locally with 20 webhook integration tests | `apps/api/.env` (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) | **YES (Test keys)** | Retain test keys locally. Client sets up live Razorpay account, completes KYC, and generates Live Keys + Webhook Secret for production. |
| **Shiprocket Logistics** | Dry-run / Mock integration | Tested with 9 integration tests; dry-run mode active | `apps/api/src/services/shiprocket.service.ts` | **YES (Code logic)** | Retain code. Client provides live production login credentials + pickup location ID. |
| **Next.js Image Hostname** | `apps/storefront/next.config.js` | Fallback to `pub-cbf2a823886f4d379eba3abf625d08ac.r2.dev` | Hardcoded fallback for images | **UPDATE** | Storefront dynamically reads `NEXT_PUBLIC_R2_PUBLIC_URL`; fallback will update to client custom CDN domain. |
| **Notification Brand** | `apps/api/src/services/notification/notification.service.ts` | Customer SMS previously said "WePrintIt" | SMS templates on lines 38 & 76 | **UPDATED** | Replaced with "First Memoir" in current commit. |

---

## 3. Four-Tier Classification of All Infrastructure References

### A. SAFE TO KEEP (Preserve Historical & Architectural Integrity)
- **Prisma Migrations:** `packages/database/prisma/migrations/*` (Linear, idempotent database history: `0_init`, `add_user_roles`, `add_image_order`, etc.).
- **Prisma Schema:** `packages/database/prisma/schema.prisma` (Authoritative data model).
- **Architecture Documentation:** `docs/architecture/*`, `docs/phases/*`, `CURRENT_STATE.md`, `DEVELOPMENT_HANDOFF.md`, `PROJECT_STATE.md`.
- **Test Infrastructure:** `docker-compose.test.yml`, `scripts/test-setup.sh`, `scripts/test-teardown.sh`, `apps/api/.env.test`, `packages/database/.env.test`.
- **Monorepo Package Names:** `packages/database` (`@repo/database`), `packages/api-client` (`@repo/api-client`), root `package.json` (`WePrintIt.in` package identifier).
- **Source Catalog Inventory:** `/Users/ayushtomar/Downloads/listingx for website/LISTING PICTURES (all)/` (452 source images, 82 listing folders).
- **Local Dev Environment:** Localhost API on port 3001, Storefront on port 3000, Docker DB on port 54320.

### B. MUST UPDATE (Stale Configurations Corrected)
- **`render.yaml` Environment Keys:**
  - *Previous:* Referenced non-existent `JWT_SECRET` and `CLOUDFLARE_R2_*`.
  - *Corrected:* Aligned strictly with `apps/api/src/config/env.ts` (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `SHIPROCKET_WEBHOOK_TOKEN`).
- **Customer Notification Copy:**
  - *Previous:* `apps/api/src/services/notification/notification.service.ts` contained "Your WePrintIt order...".
  - *Corrected:* Updated to "Your First Memoir order...".
- **Next.js CDN Fallback:**
  - *Target:* When new Cloudflare custom domain is established (e.g. `cdn.firstmemoir.in`), set `NEXT_PUBLIC_R2_PUBLIC_URL=https://cdn.firstmemoir.in` in Vercel.

### C. SECRET/LOCAL CONFIGURATION TO ROTATE UPON NEW ACCOUNTS
*(Listed by environment variable name only; NO values printed)*
- **Vercel CLI Token:** `VERCEL_OIDC_TOKEN` (in root `.env.local`).
- **Cloudflare R2 API Credentials:** `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID` (in `apps/api/.env`).
- **Razorpay Keys:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (in `apps/api/.env`).
- **Shiprocket Credentials:** `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_WEBHOOK_TOKEN`.
- **JWT & Session Secrets:** `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`.
- **Production Database String:** `DATABASE_URL` (points to production Neon instance).

### D. EXTERNAL ACCOUNT RESOURCES REQUIRING MANUAL ACTION
*(Do NOT delete automatically; requires owner action in respective dashboards)*
- **Old Vercel Project (`firstmemoir-storefront` on `team_7KNdhTyKbzmdYvn7jRqzvcq9`):** Leave active for reference until the new client Vercel project is verified, then archive/delete.
- **Old Cloudflare R2 Bucket (`weprintit-assets` on Account `694b7628...`):** Leave intact until all verified production assets are uploaded to the client's new R2 bucket.
- **Old Razorpay Dashboard:** Any test webhooks pointing to temporary staging tunnels/URLs should be disabled.
- **GitHub Repository Access:** Once the client creates their GitHub organization, add team collaborators with appropriate permissions.

---

## 4. Deep-Dive per Infrastructure Provider

### 4.1 GitHub
- **Current State:** Repository hosted at `https://github.com/ayush-writes-code/FirstMemoir.git`.
- **Current Branch:** `phase-3-2-categories`.
- **Workflows:** `.github/workflows/ci.yml` runs automated linting, typechecking, and build validation on push/PR to `main`. It contains **no secrets**, **no deploy keys**, and **no cloud provider integrations**.
- **Action Required:**
  1. Client creates organization or account (e.g. `firstmemoir` or client username).
  2. Client creates a private repository `FirstMemoir`.
  3. Add new remote: `git remote add client https://github.com/<client-org>/FirstMemoir.git`.
  4. Push all branches and tags: `git push client --all && git push client --tags`.
  5. The existing `ayush-writes-code/FirstMemoir` repository remains preserved as development history.

### 4.2 Vercel
- **Current State:** Connected to project `prj_uWYEPSY69cr3YgB9Ht483yH1E3lU` via `.vercel/project.json`.
- **Environment Variables:** `NEXT_PUBLIC_API_URL` controls API routing. In local development, `apps/storefront/.env.local` sets this to `http://localhost:3001/api/v1`.
- **Action Required:**
  1. Client sets up fresh Vercel team/account.
  2. Import project from the new client GitHub repository.
  3. Set Root Directory to `apps/storefront`.
  4. Configure Environment Variables:
     - `NEXT_PUBLIC_API_URL` = `https://<client-render-api-subdomain>.onrender.com/api/v1`
     - `NEXT_PUBLIC_R2_PUBLIC_URL` = `https://cdn.firstmemoir.in` (or client R2 public URL)
  5. Attach production domain `firstmemoir.in` and `www.firstmemoir.in`.
  6. Locally, remove `.vercel/` and run `npx vercel link` to connect local CLI to the new project.

### 4.3 Render
- **Current State:** Defined via Infrastructure-as-Code in `render.yaml` (`name: firstmemoir-api`, Docker runtime, `singapore` region, starter plan, autoDeploy: false).
- **Health Probes:**
  - Liveness: `GET /api/health/live` (responds 200 OK without database connection).
  - Readiness: `GET /api/health/ready` (queries database `SELECT 1`).
- **Action Required:**
  1. Client creates Render account.
  2. Connect Render to the new client GitHub repository.
  3. Create Web Service using `render.yaml` blueprint.
  4. Inject production secrets in Render Dashboard:
     - `DATABASE_URL` (Neon production string)
     - `CORS_ORIGIN` (`https://firstmemoir.in,https://www.firstmemoir.in,https://<client-storefront>.vercel.app`)
     - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`
     - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
     - `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_WEBHOOK_TOKEN`
     - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

### 4.4 Cloudflare R2
- **Current State:** Bucket `weprintit-assets` under account `694b7628005c133e000f815f81d91640`.
- **Known Issue:** Vercel origin `https://firstmemoir-storefront.vercel.app` fails CORS preflight (HTTP 403) because bucket CORS was not configured for remote Vercel domains.
- **Action Required:**
  1. Client creates Cloudflare account.
  2. Create R2 bucket: `firstmemoir-assets` (Location: APAC or Auto).
  3. Configure Bucket CORS:
     ```json
     [
       {
         "AllowedOrigins": [
           "http://localhost:3000",
           "https://firstmemoir.in",
           "https://www.firstmemoir.in",
           "https://*.vercel.app"
         ],
         "AllowedMethods": ["GET", "PUT", "HEAD"],
         "AllowedHeaders": ["*"],
         "ExposeHeaders": ["ETag"],
         "MaxAgeSeconds": 3600
       }
     ]
     ```
  4. Connect Custom Domain: e.g. `cdn.firstmemoir.in` or `assets.firstmemoir.in`.
  5. Generate API Token with `Object Read & Write` permissions scoped to `firstmemoir-assets`.
  6. Provide `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_PUBLIC_URL`.

### 4.5 Razorpay
- **Current State:** Service implementation in `apps/api/src/services/razorpay.service.ts`. Raw body webhook handler in `apps/api/src/controllers/webhook.controller.ts` on `/api/v1/webhooks/razorpay`.
- **Action Required:**
  1. Client activates Razorpay live account and finishes business KYC.
  2. Generate Production API Key ID and Key Secret.
  3. Register Webhook Endpoint in Razorpay Dashboard:
     - URL: `https://<client-render-api>.onrender.com/api/v1/webhooks/razorpay`
     - Active Events: `order.paid`, `payment.captured`, `payment.failed`
     - Webhook Secret: Generate high-entropy string and inject as `RAZORPAY_WEBHOOK_SECRET` in Render.

### 4.6 Shiprocket
- **Current State:** Integration in `apps/api/src/services/shiprocket.service.ts`. Supports dry-run simulation via `SHIPROCKET_DRY_RUN=true`.
- **Action Required:**
  1. Client sets up live Shiprocket account and adds primary warehouse/pickup address.
  2. Provide `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD`.
  3. Configure Webhook in Shiprocket Dashboard:
     - URL: `https://<client-render-api>.onrender.com/api/v1/webhooks/shiprocket`
     - Token: Set shared `SHIPROCKET_WEBHOOK_TOKEN` in Render and Shiprocket.

### 4.7 Neon PostgreSQL
- **Current State:** Schema defined in `packages/database/prisma/schema.prisma`. 119 integration tests run against local Docker database `localhost:54320`.
- **Action Required:**
  1. Client decides whether to reuse existing Neon staging database or create a new project in a client-owned Neon account.
  2. Once `DATABASE_URL` is configured on Render, run non-destructive migration deploy:
     `npx prisma migrate deploy`
  3. Do NOT run `prisma db push` or `prisma migrate reset`.

---

## 5. Explicit Things NOT to Delete

1. **DO NOT delete the GitHub repository** `ayush-writes-code/FirstMemoir` or any branches.
2. **DO NOT delete Prisma migration files** in `packages/database/prisma/migrations/`.
3. **DO NOT reset or drop the Neon database**.
4. **DO NOT delete the legacy R2 bucket `weprintit-assets`** or any objects inside it.
5. **DO NOT delete the local Docker test container environment** (`docker-compose.test.yml`, `scripts/test-setup.sh`).
6. **DO NOT delete the 452 source catalog images** in `/Users/ayushtomar/Downloads/listingx for website/LISTING PICTURES (all)/`.
7. **DO NOT delete existing documentation** (`CURRENT_STATE.md`, `docs/*`).
8. **DO NOT delete local `.env` files** (they are gitignored and required for localhost development).

---

## 6. Migration & Onboarding Sequence for New Accounts

```
[Phase 1: Account Creation (Client)]
  │  Create fresh GitHub, Vercel, Render, Cloudflare, Razorpay, Shiprocket accounts.
  ▼
[Phase 2: Code Repository Transfer]
  │  Add client GitHub remote; push all branches and tags.
  ▼
[Phase 3: Database & Backend Deployment]
  │  1. Create Neon database (or confirm staging DB).
  │  2. Deploy Render Web Service from render.yaml blueprint.
  │  3. Inject Render environment variables.
  │  4. Execute non-destructive migration: npx prisma migrate deploy.
  │  5. Verify health check: GET /api/health/live and GET /api/health/ready.
  ▼
[Phase 4: Object Storage & CDN]
  │  1. Create Cloudflare R2 bucket firstmemoir-assets.
  │  2. Apply CORS policy allowing localhost, vercel.app, and firstmemoir.in.
  │  3. Attach custom domain cdn.firstmemoir.in.
  │  4. Upload approved catalog assets from R2_ASSET_MIGRATION_MANIFEST.md.
  ▼
[Phase 5: Storefront Deployment]
  │  1. Connect Vercel to client GitHub repository.
  │  2. Set NEXT_PUBLIC_API_URL to production Render URL.
  │  3. Set NEXT_PUBLIC_R2_PUBLIC_URL to production CDN URL.
  │  4. Deploy Storefront and verify SSR and image optimization.
  │  5. Attach custom domain firstmemoir.in and configure DNS records.
  ▼
[Phase 6: Gateway & Logistics Handshake]
  │  1. Register Razorpay webhook endpoint on production Render API.
  │  2. Register Shiprocket webhook endpoint on production Render API.
  │  3. Execute ₹1 test transaction in Razorpay live mode.
  │  4. Verify webhook receipt, order confirmation, and immutable snapshot creation.
  ▼
[Phase 7: Catalog Hydration & Go-Live]
  │  1. Run catalog importer with --apply to hydrate products from verified client data.
  │  2. Final browser smoke test across mobile and desktop.
  │  3. PUBLIC LAUNCH.
```
