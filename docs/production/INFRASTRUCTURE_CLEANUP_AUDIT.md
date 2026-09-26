# FirstMemoir — Infrastructure Ownership & Environment Separation

*Last Updated: September 26, 2026*  
*Author: Engineering Team*  
*Policy: Strict Environment Isolation — Developer Staging Preserved, Client Production Separated*

---

## 1. Executive Summary & Ownership Architecture

This document establishes the authoritative infrastructure ownership boundaries and environment separation strategy for FirstMemoir.

A fundamental architectural principle governs this project:

> [!IMPORTANT]
> **DEVELOPMENT INFRASTRUCTURE PRESERVATION + PRODUCTION SEPARATION**
> 
> The existing development and staging infrastructure belongs to the **developer/engineering team**. It is **PERMANENTLY PRESERVED** and will **NEVER** be deleted, retired, renamed, transferred, or mutated by production activities.
> 
> Production will be provisioned as a completely **SEPARATE, CLIENT-OWNED ENVIRONMENT** with dedicated client accounts.

```
                      ┌────────────────────────────────────────┐
                      │          FIRSTMEMOIR PLATFORM          │
                      └──────────────────┬─────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼                                               ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│     DEVELOPER-OWNED / DEV       │             │     CLIENT-OWNED / PRODUCTION   │
├─────────────────────────────────┤             ├─────────────────────────────────┤
│ • GitHub: ayush-writes-code     │             │ • GitHub: client-org/FirstMemoir│
│ • Vercel: dev project           │             │ • Vercel: firstmemoir-storefront│
│ • Render: dev/reference service │             │ • Render: production API service│
│ • Cloudflare: dev account       │             │ • Cloudflare: client account    │
│ • R2: weprintit-assets (LOCKED) │             │ • R2: firstmemoir-assets        │
│ • Razorpay: TEST credentials    │             │ • Razorpay: LIVE credentials    │
│ • Shiprocket: DEV / DRY-RUN     │             │ • Shiprocket: LIVE credentials  │
│ • Neon: STAGING database        │             │ • Neon / RDS: PRODUCTION DB     │
│ • Local: Docker PostgreSQL      │             │ • Domain: firstmemoir.in        │
└─────────────────────────────────┘             └─────────────────────────────────┘
```

---

## 2. Infrastructure Inventory & Ownership Matrix

| Resource | Developer Environment (PRESERVED) | Client Production Environment (TO BE PROVISIONED) | Separation Policy |
|---|---|---|---|
| **GitHub** | `ayush-writes-code/FirstMemoir` (Keeps all commits, phase branches, development history) | Fresh repository under client organization (e.g. `client-org/FirstMemoir`) | Developer repo is primary source of engineering history. Code will be pushed to client remote via Git mirror/remote. |
| **Vercel** | Project `firstmemoir-storefront` (`prj_uWYEPSY69cr3YgB9Ht483yH1E3lU`) under developer team | New Vercel project under client Vercel organization | Developer Vercel project remains for preview/staging testing. Client project attaches custom domain `firstmemoir.in`. |
| **Render** | `render.yaml` configuration in developer repo; reference staging API | Production Render Web Service under client Render account | Managed independently. Production Render instance points to client production database. |
| **Cloudflare R2** | Bucket `weprintit-assets` under developer Cloudflare account | Fresh bucket (e.g. `firstmemoir-assets`) under client Cloudflare account | **CRITICAL:** `weprintit-assets` is permanently locked for dev/test imagery. Production uses a completely isolated client bucket with custom domain `cdn.firstmemoir.in`. |
| **Database** | Neon Staging (`ep-wispy-glitter-axsmkbyo`) + Local Docker (`localhost:54320`) | Separate client-owned production database instance | Dev/staging databases are never exposed to production traffic or live orders. Production runs `npx prisma migrate deploy`. |
| **Razorpay** | Developer Razorpay TEST account + test API keys in local `.env` | Client-owned Razorpay LIVE account with completed commercial KYC | **NEVER MIXED:** Developer test keys remain permanently active for dev/regression testing. Production requires separate live keys. |
| **Shiprocket** | Developer Shiprocket development/test account (`SHIPROCKET_DRY_RUN=true`) | Client-owned Shiprocket LIVE account with verified warehouse pickup address | Developer account remains active for fulfillment simulation and test AWB tracking. |

---

## 3. Strict Rules for Developer Resources

### 3.1 R2 Bucket: `weprintit-assets`
* **PERMANENT PRESERVATION:**
  - DO NOT delete the bucket.
  - DO NOT rename the bucket.
  - DO NOT empty or delete its existing objects.
  - DO NOT migrate or transfer it to the client.
  - DO NOT rotate or invalidate its development access keys.
* **Usage:** Serves as the developer's sandbox storage for regression tests, local development, and historical assets.
* **Production Boundary:** The client will create `firstmemoir-assets` under their own Cloudflare account. Production storefront and API will exclusively point to the client bucket.

### 3.2 Razorpay: Test Account & Credentials
* **PERMANENT PRESERVATION:**
  - Developer Razorpay test credentials in `apps/api/.env` are retained permanently.
  - Development webhooks (`/api/v1/webhooks/razorpay`) continue to support simulated HMAC signature verification.
* **Production Boundary:** Production orders will only accept payments through the client's live Razorpay key pair. The client dashboard will register the live webhook endpoint.

### 3.3 Shiprocket: Development Account
* **PERMANENT PRESERVATION:**
  - Developer Shiprocket account and credentials remain in place.
  - `SHIPROCKET_DRY_RUN=true` remains supported for automated local tests.
* **Production Boundary:** Live order dispatch and courier pickup requests will execute exclusively through the client's commercial Shiprocket account.

### 3.4 Neon Staging Database
* **PERMANENT PRESERVATION:**
  - Staging database `ep-wispy-glitter-axsmkbyo` will NOT be dropped, reset, or altered for production.
  - Local Docker database (`localhost:54320`) remains the default for unit/integration tests.
* **Production Boundary:** Production database will be independently hosted and migrated using `npx prisma migrate deploy`.

---

## 4. Environment Configuration & Runtime Isolation

The application codebase is already architected to cleanly differentiate between environments via environment variables:

### 4.1 Development Environment (`NODE_ENV=development` or `test`)
```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://test_user:test_password@localhost:54320/test_db?schema=public"
CORS_ORIGIN="http://localhost:3000"

# Developer Storage (weprintit-assets)
R2_ACCOUNT_ID="694b7628005c133e000f815f81d91640"
R2_BUCKET_NAME="weprintit-assets"
R2_PUBLIC_URL="https://pub-cbf2a823886f4d379eba3abf625d08ac.r2.dev"

# Developer Razorpay Test Account
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."

# Developer Shiprocket Simulation
SHIPROCKET_DRY_RUN="true"
SHIPROCKET_WEBHOOK_TOKEN="sr_webhook_mock_token"
```

### 4.2 Production Environment (`NODE_ENV=production`)
```env
NODE_ENV=production
PORT=8080
DATABASE_URL="postgresql://<client_prod_user>:<secret>@<client_prod_host>/firstmemoir_prod"
CORS_ORIGIN="https://firstmemoir.in,https://www.firstmemoir.in,https://firstmemoir-storefront.vercel.app"

# Client Production Storage (Separate Bucket)
R2_ACCOUNT_ID="<client_cloudflare_account_id>"
R2_ACCESS_KEY_ID="<client_r2_access_key>"
R2_SECRET_ACCESS_KEY="<client_r2_secret_key>"
R2_BUCKET_NAME="firstmemoir-assets"
R2_PUBLIC_URL="https://cdn.firstmemoir.in"

# Client Production Razorpay (Live Account)
RAZORPAY_KEY_ID="rzp_live_..."
RAZORPAY_KEY_SECRET="<client_live_secret>"
RAZORPAY_WEBHOOK_SECRET="<client_live_webhook_secret>"

# Client Production Shiprocket (Live Logistics)
SHIPROCKET_EMAIL="<client_shiprocket_email>"
SHIPROCKET_PASSWORD="<client_shiprocket_password>"
SHIPROCKET_WEBHOOK_TOKEN="<client_unique_webhook_token>"
```

---

## 5. Client Account Onboarding Sequence

When client accounts are established, setup proceeds without touching or endangering developer infrastructure:

1. **GitHub Setup:**
   * Create client organization repository `FirstMemoir`.
   * Push code from developer repository:
     `git remote add client https://github.com/<client-org>/FirstMemoir.git`
     `git push client --all && git push client --tags`
2. **Cloudflare Setup:**
   * Create client bucket `firstmemoir-assets`.
   * Configure CORS allowing `http://localhost:3000`, `https://firstmemoir.in`, and `https://*.vercel.app`.
   * Attach custom domain `cdn.firstmemoir.in`.
   * Upload approved catalog imagery from `R2_ASSET_MIGRATION_MANIFEST.md`.
3. **Database Setup:**
   * Provision production PostgreSQL instance.
   * Execute non-destructive schema migration: `npx prisma migrate deploy`.
4. **Render Setup:**
   * Connect Render to the client GitHub repository using `render.yaml`.
   * Populate production secrets in Render dashboard (pointing to client DB, client R2, live Razorpay, live Shiprocket).
5. **Vercel Setup:**
   * Import storefront from client GitHub repository.
   * Set `NEXT_PUBLIC_API_URL` to the client Render API domain.
   * Set `NEXT_PUBLIC_R2_PUBLIC_URL` to `https://cdn.firstmemoir.in`.
   * Attach production custom domain `firstmemoir.in`.
6. **Webhooks Setup:**
   * Register live webhook in client Razorpay dashboard.
   * Register live webhook in client Shiprocket dashboard.
7. **Verification:**
   * Execute live ₹1 smoke test transaction.
   * Verify order confirmation, payment capture, and fulfillment snapshot creation.

---

## 6. Summary of Preservation Guarantees

* [x] **Developer GitHub repository** (`ayush-writes-code/FirstMemoir`) remains active and preserved.
* [x] **Developer Vercel project** remains available for staging previews.
* [x] **Developer R2 bucket (`weprintit-assets`)** is untouched, preserved, and never deleted.
* [x] **Developer Razorpay test credentials** remain active for ongoing development.
* [x] **Developer Shiprocket test integration** remains active for fulfillment simulation.
* [x] **Developer Neon staging database** is untouched and preserved.
* [x] **Local Docker test environment** (`localhost:54320`) remains fully operational.
