# Slice 6C.4: Render Staging API Deployment Report

## 1. Executive Summary

This report documents the pre-deployment audit, quality gates, and Render deployment verification for the FirstMemoir staging Express API in Slice 6C.4.

- **Target Service**: `firstmemoir-api-staging` (Render Staging Environment)
- **Repository**: `ayush-writes-code/FirstMemoir`
- **Branch**: `phase-3-2-categories`
- **Deployment Hash**: `45d2d07` (`45d2d07466548a31e84a92cfa77d5ae43398c8c5`)
- **Current Status**: **LIVE & VERIFIED (PASS)**. The Render staging service is deployed, stable, and successfully serving health, database readiness, and public catalogue queries from the live Neon staging database.

---

## 2. Git Synchronization State

| Metric | Local | Remote (`origin`) | Status |
|---|---|---|---|
| **Branch** | `phase-3-2-categories` | `phase-3-2-categories` | In Sync |
| **Commit Hash** | `45d2d07` | `45d2d07` | **MATCH (Clean)** |
| **Working Tree** | Clean (`0` uncommitted files) | - | Clean |
| **Git Whitespace Check** | Clean (`git diff --check` = 0) | - | **PASS** |

The deployed commit `45d2d07` (`fix(api): fix Docker startup entrypoint path by setting rootDir and excluding tests in tsconfig`) fixed the entrypoint generation path in Docker so that `apps/api/dist/index.js` is produced at the expected path.

---

## 3. Render Service Configuration

- **Project**: `firstMemoir`
- **Environment**: `Staging`
- **Service Name**: `firstmemoir-api-staging`
- **Service URL**: `https://firstmemoir-api-staging.onrender.com`
- **Runtime**: `Docker`
- **Context Directory**: `.` (Root)
- **Dockerfile Path**: `apps/api/Dockerfile`
- **Health Check Path**: `/api/health/live` (Liveness probe; readiness on `/api/health/ready`)
- **Target Component**: Express API only (Storefront and Admin remain un-deployed in this slice)

---

## 4. Environment Variable Reconciliation & Security Audit

All runtime environment variables were audited against `apps/api/src/config/env.ts` (evaluated under `NODE_ENV=production`):

| Variable Name | Classification | Requirement | Configured / Expected Value | Audit Status |
|---|---|---|---|---|
| `NODE_ENV` | Non-Secret | Boot-critical | `production` | **VERIFIED** |
| `PORT` | Non-Secret | Boot-critical | `8080` | **VERIFIED** |
| `TRUST_PROXY` | Non-Secret | Boot-critical | `1` | **VERIFIED** |
| `DATABASE_URL` | Secret | Boot-critical | Neon Staging (`ep-super-queen-b38volvi...`) | **VERIFIED** |
| `JWT_ACCESS_SECRET` | Secret | Boot-critical | `[REDACTED_HIGH_ENTROPY_SECRET]` | **VERIFIED** |
| `JWT_REFRESH_SECRET` | Secret | Boot-critical | `[REDACTED_HIGH_ENTROPY_SECRET]` | **VERIFIED** |
| `COOKIE_SECRET` | Secret | Boot-critical | `[REDACTED_HIGH_ENTROPY_SECRET]` | **VERIFIED** |
| `COOKIE_SAME_SITE` | Non-Secret | Operational | `none` (Required for cross-site Vercel/Render auth) | **VERIFIED** |
| `CORS_ORIGIN` | Non-Secret | Feature | `https://firstmemoir-demo.vercel.app,http://localhost:3000,http://localhost:5173` | **VERIFIED** |
| `R2_ACCOUNT_ID` | Non-Secret | Boot-critical | `694b7628005c133e000f815f81d91640` | **VERIFIED** |
| `R2_ACCESS_KEY_ID` | Secret | Boot-critical | `[REDACTED_CLOUDFLARE_KEY_ID]` | **VERIFIED** |
| `R2_SECRET_ACCESS_KEY` | Secret | Boot-critical | `[REDACTED_CLOUDFLARE_SECRET_KEY]` | **VERIFIED** |
| `R2_PUBLIC_BUCKET_NAME`| Non-Secret | Boot-critical | `firstmemoir-public-assets` | **VERIFIED** |
| `R2_PRIVATE_BUCKET_NAME`| Non-Secret | Boot-critical | `firstmemoir-private-uploads` | **VERIFIED** |
| `R2_PUBLIC_URL` | Non-Secret | Feature | `https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev` | **VERIFIED** |
| `RAZORPAY_KEY_ID` | Non-Secret | Boot-critical | Razorpay Test Key (`rzp_test_...`) | **VERIFIED** |
| `RAZORPAY_KEY_SECRET` | Secret | Boot-critical | `[REDACTED_RAZORPAY_TEST_SECRET]` | **VERIFIED** |
| `RAZORPAY_WEBHOOK_SECRET`| Secret | Boot-critical | `[REDACTED_WEBHOOK_SECRET]` | **VERIFIED** |
| `SHIPROCKET_DRY_RUN` | Non-Secret | Operational | `true` | **VERIFIED** |

*Security check*: No credentials, passwords, private keys, or raw connection strings are printed or committed.

---

## 5. Deployment Quality Gates

1. **Storage Routing Guards & Access Model (`r2.provider.ts`)**:
   - `products/*` routes strictly to public bucket: **PASS**
   - `previews/*` routes strictly to private bucket: **PASS**
   - `customers/*` routes strictly to private bucket: **PASS**
   - Public access fail-closed for customer & preview keys: **PASS**
   - Public product asset URL generation: **PASS**
   - Unrecognized key prefix fail-closed: **PASS**
   - Presigned signed URL generation for private keys: **PASS**
   - **Score**: 7/7 PASSED.
2. **TypeScript Compilation (`apps/api`)**:
   - `npm run build --workspace=api` (`tsc`): **PASS** (0 errors).
3. **Turbo Containerized Build**:
   - `npx turbo run build --filter=api... --force`: **PASS** (3/3 workspace targets compiled without errors).
4. **Git Formatting & Patch Quality**:
   - `git diff --check`: Clean (**PASS**).

---

## 6. Live Endpoint Verification (Remote Staging Evidence)

All requests were made directly to the live Render endpoint `https://firstmemoir-api-staging.onrender.com`:

### 6.1 Liveness Probe (`GET /api/health/live`)
- **Status**: `HTTP/2 200 OK`
- **Payload**:
  ```json
  {"status":"ok","service":"first-memoir-api"}
  ```
- **Finding**: Express process is running, responding on port 8080, and Render health-check passing.

### 6.2 Readiness Probe & Database Connectivity (`GET /api/health/ready`)
- **Status**: `HTTP/2 200 OK`
- **Payload**:
  ```json
  {"status":"ok","service":"first-memoir-api","database":"connected"}
  ```
- **Finding**: Confirmed active connection from Render to the Neon PostgreSQL staging database (`SELECT 1` query succeeded).

### 6.3 Categories Endpoint (`GET /api/v1/categories`)
- **Status**: `HTTP/2 200 OK`
- **Payload**:
  ```json
  {
    "success": true,
    "data": [
      { "id": "e7389e22-c71c-49e8-97b6-dd57e793a8e9", "name": "Wall Frames", "slug": "frames", "is_active": true },
      { "id": "bc053a2e-9859-4e32-afca-18b954660298", "name": "Posters & Wall Art", "slug": "posters", "is_active": true },
      { "id": "d585ece6-7e5a-4324-a5d8-efc57b5011c5", "name": "Bookmarks", "slug": "bookmarks", "is_active": true },
      { "id": "e0ecd350-dc25-4629-ad76-3a342be72845", "name": "Custom Photo Prints", "slug": "custom-prints", "is_active": true },
      { "id": "81a276c0-1615-4a48-a41e-bdc7da4fcf6f", "name": "All Wall Art", "slug": "wall-art", "is_active": true }
    ],
    "error": null
  }
  ```
- **Finding**: All 5 canonical categories seeded in Slice 6C.3 are successfully queried and returned.

### 6.4 Products Catalogue Endpoint (`GET /api/v1/products?limit=2`)
- **Status**: `HTTP/2 200 OK`
- **Payload**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "bf24dc6d-9810-4463-adb9-316fec14ba13",
        "name": "One Piece Wanted Posters (Pack of 10)",
        "slug": "one-piece-wanted-posters-pack-of-10",
        "sku": "FM-PST-OP-WANTED-10",
        "base_price": "249",
        "is_active": true,
        "images": [{ "url": "https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev//catalog/posters/wanted10-1.jpg" }],
        "categories": [{ "category": { "name": "Posters & Wall Art", "slug": "posters" } }]
      },
      {
        "id": "62584fe4-7b18-4366-af05-be94eba1a121",
        "name": "Football Wall Posters (Set of 10)",
        "slug": "football-wall-posters-set-of-10",
        "sku": "FM-PST-FBL-10",
        "base_price": "299",
        "is_active": true,
        "images": [{ "url": "https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev//catalog/posters/football10-1.jpg" }],
        "categories": [{ "category": { "name": "Posters & Wall Art", "slug": "posters" } }]
      }
    ],
    "meta": { "total": 82, "page": 1, "limit": 2, "totalPages": 41 },
    "error": null
  }
  ```
- **Finding**: Exactly 82 canonical seeded products confirmed in the remote database. Public asset URLs correctly reference `https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev/`. No administrative or customer sensitive fields are leaked.

### 6.5 CORS Preflight Verification (`OPTIONS /api/v1/categories`)
- **Status**: `HTTP/2 204 No Content`
- **Headers Verified**:
  - `access-control-allow-origin: https://firstmemoir-demo.vercel.app`
  - `access-control-allow-credentials: true`
  - `access-control-allow-methods: GET,HEAD,PUT,PATCH,POST,DELETE`
- **Finding**: Cross-origin requests from the verified live Vercel demo storefront are explicitly allowed with credentials.

---

## 7. Render Docker Startup Failure & Resolution

### Root Cause
During the initial Render Docker container startup, Node.js crashed with:
```text
Error: Cannot find module '/app/apps/api/dist/index.js'
```
Investigation of the compilation tree revealed:
1. `apps/api/tsconfig.json` was missing an explicit `"rootDir": "src"`.
2. Test files located under `apps/api/src/controllers/__tests__/` were included in the production `tsc` build.
3. Specifically, `checkout-safety.test.ts` contained an import referencing `../../../../../packages/database/prisma/catalogue/data.js` outside `apps/api/src`.
4. As a result, TypeScript inferred the common root directory across all compiled files as `/app` (the repository root) rather than `apps/api/src`.
5. `tsc` consequently mirrored the full monorepo path under `dist/`, generating `dist/apps/api/src/index.js` and `dist/packages/...` instead of `dist/index.js`.
6. When the runner container executed `CMD ["node", "apps/api/dist/index.js"]`, the entry point was absent from `/app/apps/api/dist/index.js`.

### Fix Implemented
In [`apps/api/tsconfig.json`](file:///Users/ayushtomar/Downloads/WePrintIt.in/apps/api/tsconfig.json):
- Added `"rootDir": "src"` to strictly anchor compilation output to `apps/api/src`.
- Added `"exclude": ["node_modules", "dist", "src/**/__tests__", "src/**/*.test.ts"]` so that test suites (which are executed dynamically via `tsx`) are excluded from the production compiled distribution.

---

## 8. AWS SDK Node.js 20 Deprecation Warning Investigation

### Observation
Render container build logs report a warning from `@aws-sdk/client-s3`:
```text
[AWS-SDK-JS-V3] (warning) Node.js 20 is end-of-life and will not be supported by future versions of AWS SDK for JavaScript...
```

### Analysis
- Node.js 20 LTS transitioned to Maintenance LTS in 2025 and reached official End-of-Life on April 30, 2026.
- AWS SDK v3 emits this advisory warning on process startup under Node.js 20.
- Current status: The AWS SDK v3 client operates without functional degradation on Node.js 20; the warning is purely informational and does not cause runtime errors.
- Monorepo compatibility for Node.js 22:
  - Root `package.json` specifies `"engines": { "node": ">=18" }`.
  - TypeScript compilation targets `ES2022` with `NodeNext` modules.
  - Turborepo, Prisma 5, and Next.js 16 all officially support Node.js 22 LTS.

### Recommendation
Do **not** change Docker base images in this slice to preserve deployment stability. Plan a separate runtime upgrade slice to bump `node:20-slim` to `node:22-slim` in `apps/api/Dockerfile` along with a full dependency re-validation.

---

## 9. Final Verdict & Next Steps

### Verdict: **`SLICE 6C.4 = PASS`**

The Express API is successfully deployed to Render Staging, connected to Neon PostgreSQL, serving the canonical catalogue, and enforcing staging CORS rules.

### Next Recommended Milestone
**Slice 6C.5: Storefront API Integration & Staging E2E Checkout Verification**
- Configure Vercel staging storefront `NEXT_PUBLIC_API_URL` to point to `https://firstmemoir-api-staging.onrender.com/api/v1`.
- Verify storefront browsing, cart operations, custom photo upload to Cloudflare R2 staging buckets, and Razorpay Sandbox test checkout end-to-end.

