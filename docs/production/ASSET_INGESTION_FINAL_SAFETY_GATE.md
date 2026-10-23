# FirstMemoir — Canonical Asset Ingestion Final Safety Gate & Readiness Review

**Audit Date:** October 14, 2026  
**Git Branch:** `phase-3-2-categories`  
**Git HEAD Commit:** `e97d30b` (*feat(storefront): optimize PageSpeed, harden auth and accessibility, and add security guardrails*)  
**Audit Scope:** READ-ONLY / LOCAL-ONLY PRE-INGESTION AUDIT  
**Status:** **LIVE EXECUTION BLOCKED (Pre-Ingestion Snapshot & Cloudflare Gate Required)**

---

## 1. Executive Summary & Verdict

| Verification Gate | Result | Notes |
| :--- | :---: | :--- |
| **Workspace Integrity & Preflight** | **PASS** | Working tree preserved; 0 uncommitted changes staged/committed; all 7 pipeline artifacts intact. |
| **Test Suite Isolation (`NODE_ENV=test`)** | **PASS** | 19 / 19 tests passed (exit code 0); 0 network calls, 0 unmocked DB/S3 writes, 0 artifact overwrites. |
| **Database Baseline Status** | **UNRECOVERABLE FROM LOCAL EVIDENCE** | Local artifacts contain original placeholder paths, but staging database row UUIDs are unrecoverable without live query. |
| **Rollback & Interruption Readiness** | **BLOCKED** | Re-run is idempotent; however, rollback implementation is blocked pending live pre-ingestion snapshot capture. |
| **Cloudflare Private Bucket Gate** | **UNVERIFIED (External Gate)** | Application routing is verified private; external Cloudflare R2 dashboard settings require manual operator verification. |
| **Staging Ingestion Execution Status** | **NOT EXECUTED** | Standing by for explicit operator authorization and prerequisites. |

---

## 2. Test-Hardening & Pipeline Diff Review

A complete diff review of [`scripts/ingest-canonical-assets.ts`](../../scripts/ingest-canonical-assets.ts) and [`scripts/__tests__/ingest-canonical-assets.test.ts`](../../scripts/__tests__/ingest-canonical-assets.test.ts) confirms that the following invariants are enforced:

### A. Ingestion Engine Hardening ([`scripts/ingest-canonical-assets.ts`](../../scripts/ingest-canonical-assets.ts))
1. **Network Boundary Isolation:**
   - Added `fetchFn?: typeof fetch` and `stagingProducts?: any[]` to `RunIngestionOptions`.
   - When `options.stagingProducts` is provided, network calls are completely bypassed.
   - When `options.fetchFn` is provided, requests are routed exclusively through the mock.
   - When running under `process.env.NODE_ENV === 'test'` without an explicit `fetchFn`, live HTTP requests to `https://firstmemoir-api-staging.onrender.com/api/v1` are **disabled**, and the pipeline falls back to local definitions with zero network traffic.
2. **Test Environment Live Write Lockout:**
   - Enforced fail-closed guard: if `NODE_ENV === 'test'` and `isLive === true`, both `storageClient` and `dbClient` **must** be explicitly provided mocks. Missing mocks cause immediate throw before any S3 or Prisma clients are initialized.
3. **Artifact Overwrite Protection:**
   - Added `writeArtifacts?: boolean` (defaults to `true`). In tests, `writeArtifacts: false` prevents modifying `docs/production/ASSET_INGESTION_MANIFEST.json` and `docs/production/DATABASE_RECONCILIATION_PREVIEW.json`.
   - Added CLI flags `--no-write`, `--output-manifest=<path>`, and `--output-preview=<path>` so operators can generate reviewable dry-runs without overwriting baseline files.
4. **Configurable Directory Isolation:**
   - Added `sourceDir?: string` to decouple local filesystem paths and test missing directory handling.

### B. Test Suite Hardening ([`scripts/__tests__/ingest-canonical-assets.test.ts`](../../scripts/__tests__/ingest-canonical-assets.test.ts))
- Set `process.env.NODE_ENV = 'test'` at module root.
- Added `createMockPlaceholderProducts()` to supply 82 catalogue products with initial placeholder records offline.
- Added 3 dedicated isolation and safety tests:
  - Network boundary isolation verification (ensuring `fetchFn` receives expected queries and `stagingProducts` bypasses network).
  - Unmocked live execution lockout (verifying fail-closed safety in test environments).
  - Missing source directory fail-closed check.

---

## 3. Fresh Test Execution Results

**Execution Command:**
```bash
NODE_ENV=test node --import tsx --test scripts/__tests__/ingest-canonical-assets.test.ts
```

**Results:**
- **Exit Code:** `0`
- **Suites:** 2 passed, 2 total
- **Tests:** **19 passed, 0 failed, 0 skipped, 0 cancelled**
- **Duration:** 43.5 seconds
- **External Network Requests:** Exactly **0**

---

## 4. Database Baseline Reconstruction Analysis

A forensic review was conducted across [`packages/database/prisma/catalogue/data.ts`](../../packages/database/prisma/catalogue/data.ts), [`packages/database/prisma/seed.ts`](../../packages/database/prisma/seed.ts), [`docs/production/PRODUCT_IMAGE_COVERAGE_AUDIT.md`](./PRODUCT_IMAGE_COVERAGE_AUDIT.md), and [`docs/production/DATABASE_RECONCILIATION_PREVIEW.json`](./DATABASE_RECONCILIATION_PREVIEW.json):

1. **Original Catalogue Placeholders (Verified Fact):**
   - In `data.ts` and `seed.ts`, all 82 products originally define exactly 1 image in `images: [...]` at `sort_order: 0` pointing to local placeholder paths (e.g. `/catalog/frames/ffc-camaro-1.jpg`).
2. **Current Reconciliation Preview State (Verified Fact):**
   - `DATABASE_RECONCILIATION_PREVIEW.json` contains 82 product proposals with 452 images where all 452 actions are **`RETAIN`**. It already references canonical `products/*` keys and does **not** contain the pre-ingestion placeholder paths.
3. **Staging Database Row Identifiers (Unknown Offline):**
   - The remote PostgreSQL database row UUIDs (`ProductImage.id` and `Product.id`) for the original placeholder records cannot be proven from local artifacts alone without querying the live database.
4. **Verdict:**
   - **`UNRECOVERABLE FROM LOCAL EVIDENCE`**.
   - Operating on assumed pre-ingestion database IDs without a verified snapshot introduces data-corruption risk.

---

## 5. Rollback & Recovery Architecture (Specification Only)

Because the database baseline is unrecoverable offline, **no speculative destructive rollback script has been implemented**. The required recovery architecture for a future implementation is specified as follows:

### Required Acceptance Criteria for `scripts/rollback-canonical-assets.ts`:
1. **Authoritative Input:** Must ingest an immutable JSON snapshot (`STAGING_PRE_INGESTION_SNAPSHOT.json`) captured immediately prior to the live migration.
2. **Staging Lockout:** Must require `--rollback --confirm-staging` and validate that `DATABASE_URL` strictly points to the approved Neon staging endpoint (`ep-super-queen-b38volvi`).
3. **Selective Deletion:**
   - Must **only** delete `ProductImage` records where `sort_order > 0` AND `file_key` strictly matches `^products/[a-z0-9-]+/gallery-\d+\.webp$`.
   - Must **never** execute an unconditional `DELETE WHERE sort_order > 0`.
4. **Primary Reversion:**
   - Must verify that `sort_order = 0` currently references `products/<slug>/primary.webp` and matches the recorded snapshot ID before reverting `file_key` to the original placeholder path.
5. **Storage Decoupling:**
   - Must never delete files from Cloudflare R2 during database rollback. Uploaded R2 assets remain harmless and immutable.

---

## 6. Cloudflare R2 Access Control & Security Gate

> [!WARNING]
> **Status: UNVERIFIED (Cloudflare External Gate)**
> Application-level access control has been verified in code:
> - Keys under `products/*` &rarr; `firstmemoir-public-assets` (public read).
> - Keys under `customers/*` and `previews/*` &rarr; `firstmemoir-private-uploads` (presigned short-lived HMAC URLs only; `getPublicUrl` explicitly throws `ForbiddenException`).
>
> However, **CORS is not an access-control mechanism**, and application code cannot prove that Cloudflare R2 bucket-level settings are private.

### Required Manual Operator Checks in Cloudflare Dashboard:
1. Navigate to **Cloudflare Dashboard &rarr; R2 Object Storage &rarr; `firstmemoir-private-uploads`**.
2. Under **Settings &rarr; Public Access**:
   - Verify **R2.dev subdomain** is **Disabled / Not Allowed**.
   - Verify **Custom Domains** list is **Empty** (no domain bound).
   - Under **CORS Policy**, confirm allowed origins are restricted solely to authorized storefront domains.
3. Under **`firstmemoir-public-assets`**:
   - Verify public read access (R2.dev or custom CDN domain) is active.

---

## 7. Execution Command Audit & Future Staging Procedure

### CLI Argument Parser Verification
Inspection of [`scripts/ingest-canonical-assets.ts#L928-L948`](../../scripts/ingest-canonical-assets.ts#L928-L948) confirms:
- Live mutation requires **both** `--execute` and `--confirm-staging` (or `--target=staging`).
- Passing `--dry-run` forces safe mode even if `--execute` is present.
- Fresh reviewable dry-runs can be run without overwriting baseline files:
  ```bash
  npx tsx scripts/ingest-canonical-assets.ts --dry-run --output-manifest=tmp/manifest.json --output-preview=tmp/preview.json
  # or
  npx tsx scripts/ingest-canonical-assets.ts --dry-run --no-write
  ```

### Authoritative Future Live Ingestion Command
> [!CAUTION]
> **STATUS: NOT EXECUTED**  
> When the Cloudflare gate and pre-ingestion snapshot prerequisites are complete, the exact command to execute under separate authorization is:
> ```bash
> npx tsx scripts/ingest-canonical-assets.ts --execute --confirm-staging
> ```

---

## 8. Remaining Blockers Before Staging Ingestion

1. **Pre-Ingestion Database Snapshot Capture:** Capture live staging `product_images` state to an immutable snapshot file prior to first live mutation.
2. **Cloudflare Private Bucket Dashboard Check:** Operator must confirm `firstmemoir-private-uploads` has R2.dev access disabled and 0 custom domains bound.
3. **Explicit Operator Authorization:** Live execution requires separate, explicit authorization.

---

## 9. Addendum: Evidence-Based Discovery & Baseline Recovery (October 15, 2026)

### 9.1 Historical Timing of Live Ingestion
Forensic analysis of file timestamps, script outputs, and R2 metadata established the actual sequence of events:
- **Actual Live Ingestion Execution:** Executed on **October 12, 2026 at 21:49:15 IST** via `npx tsx scripts/ingest-canonical-assets.ts --execute --confirm-staging`.
- **R2 Object Timestamps:** Authenticated AWS SDK S3 `ListObjectsV2Command` metadata confirms all 452 canonical WebP objects were created on **Mon Oct 12 2026 between 21:44:10 and 21:49:15 IST**.
- **Manifest / Preview Generation:** `docs/production/ASSET_INGESTION_MANIFEST.json` and `docs/production/DATABASE_RECONCILIATION_PREVIEW.json` were written by the CLI tool during that October 12 execution.

### 9.2 Critical Disambiguation: `STAGING_PRE_INGESTION_SNAPSHOT.json`
- **Creation Timestamp:** `2026-10-14T14:33:25.710Z` (October 14, 2026, 20:03:25 IST).
- **Snapshot Contents:** Contains 82 active products and 452 `ProductImage` rows with canonical `products/*` file keys.
- **Classification:** This file is a **current-state post-ingestion recovery snapshot**, NOT a pre-ingestion rollback baseline. Because it was generated 47 hours after the October 12 execution, it records the live canonical state. It cannot restore the database to the historical pre-ingestion placeholder state.

### 9.3 Complete Paginated Cloudflare R2 Public Bucket Audit
- **Listing Method:** Full paginated traversal via `ListObjectsV2Command` loop with `ContinuationToken` in `firstmemoir-public-assets`.
- **Total Objects Listed:** Exactly **452**.
- **Key Prefix Compliance:** 452 / 452 start with `products/` and end with `.webp`. Exactly 0 non-product or unexpected keys exist.
- **Manifest Parity:** Compared against `ASSET_INGESTION_MANIFEST.json` (452 keys):
  - Missing in R2: **0**
  - Extra / Unmanaged in R2: **0**
  - **Parity Result: EXACT 1:1 MATCH (100%)**.

### 9.4 Complete Neon Staging Database Audit
- **Query Method:** Direct read-only query to Neon staging PostgreSQL via Prisma client.
- **Total Active Products:** Exactly **82**.
- **Total `ProductImage` Rows:** Exactly **452** (82 primary at `sort_order = 0`, 370 gallery at `sort_order > 0`).
- **Placeholder Rows Remaining:** **0** (no `/catalog/` paths remain).
- **Manifest Parity:**
  - Missing in DB: **0**
  - Extra in DB: **0**
  - **Parity Result: EXACT 1:1 MATCH (100%)**.

