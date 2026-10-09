# Slice 6C.3: Staging Data Infrastructure Verification Report

## 1. Executive Summary

This document records the empirical execution and verification results for Slice 6C.3 Staging Data Infrastructure.
The staging environment data layer was connected and tested:
- **Staging PostgreSQL (Neon)**: **VERIFIED**. Connected, 6 Prisma migrations applied via `migrate deploy`, and idempotent seed verified twice (82 canonical products).
- **Staging Cloudflare R2**: **BLOCKED / RUNTIME NOT VERIFIED**. The configured public domain is active, but S3 API operations with the configured credentials returned HTTP 401 Unauthorized.
- **Legacy Bucket (`weprintit-assets`)**: **UNTOUCHED**. No operations performed against legacy assets.

---

## 2. Staging PostgreSQL Infrastructure

- **Provider**: Neon Serverless PostgreSQL (`ap-southeast-1` AWS Singapore pooler)
- **Host**: `ep-super-queen-b38volvi-pooler.c-4.ap-southeast-1.aws.neon.tech`
- **Database**: `neondb`
- **Initial State**: Empty public schema (`pg_tables` count: 0)

### 2.1 Migration Evidence (`npx prisma migrate deploy`)
- **Status**: SUCCESS (6/6 migrations applied cleanly)
- **Migrations Applied**:
  1. `20260815182538_init`
  2. `20260818045335_add_order_status_history`
  3. `20260818053520_add_notification_log`
  4. `20260830165330_add_notification_idempotency_constraint`
  5. `20260920095515_add_metadata_fields_to_product`
  6. `20261003112229_make_upload_optional`

### 2.2 Seed & Idempotency Evidence (`prisma/seed.ts`)
- **Run 1**:
  - Categories Upserted: 5
  - Products Created: 82
  - Products Updated: 0
- **Run 2 (Idempotency Re-check)**:
  - Categories Upserted: 5
  - Products Created: 0
  - Products Updated: 82
  - Duplicates Created: 0

### 2.3 Catalogue Reconciliation Evidence
Verified against the live staging database:
- **Total Products**: 82
- **Missing Canonical Slugs**: 0
- **Unique SKUs**: 82
- **Price Provenance**:
  - `CONFIRMED_SOURCE`: 48
  - `PROVISIONAL_ESTIMATE`: 34
- **Core Categories**: 5 (`frames`, `posters`, `bookmarks`, `custom-prints`, `wall-art`)

---

## 3. Cloudflare R2 Storage Infrastructure

- **Target Public Bucket**: `firstmemoir-public-assets`
- **Target Private Bucket**: `firstmemoir-private-uploads`
- **Configured Public URL**: `https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev`

### 3.1 Public Domain Verification
- `curl -I https://pub-c0dc396fc2f245cca9ef062272bb82f4.r2.dev` returns `HTTP/1.1 404 Not Found` from `Server: cloudflare`.
- The public edge domain is reachable and actively served by Cloudflare.

### 3.2 S3 API Runtime Access Check
- **Status**: **R2 RUNTIME ACCESS: NOT VERIFIED (BLOCKED)**
- **Evidence**:
  - Executed PutObject / HeadBucket / GetObject requests via `@aws-sdk/client-s3` and SigV4 curl to `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`.
  - Cloudflare R2 responded with `HTTP 401 Unauthorized` (`<Code>Unauthorized</Code><Message>Unauthorized</Message>`).
  - Both `firstmemoir-public-assets` and `firstmemoir-private-uploads` return 401.
- **Root Cause**: The R2 API token or Access Key ID / Secret Access Key pair configured in the environment is invalid, lacks Object Read/Write permissions on the staging buckets, has an IP restriction, or was revoked in Cloudflare.

---

## 4. CORS Configuration Specification (Required for Staging)

When configuring CORS on the private bucket (`firstmemoir-private-uploads`) in Cloudflare Dashboard:
- **Allowed Origins**: Staging storefront origin(s) (e.g., `https://firstmemoir-demo.vercel.app`, `http://localhost:3000`)
- **Allowed Methods**: `PUT`, `GET`, `HEAD`
- **Allowed Headers**: `*` (or `Content-Type`, `Content-Length`, `x-amz-*`)
- **Exposed Headers**: `ETag`
- **Max Age**: 3600 seconds

---

## 5. Remaining Blockers

1. **R2 API Token Credentials**: Update `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` in the environment with a working token that has `Object Read & Write` permissions on `firstmemoir-public-assets` and `firstmemoir-private-uploads`.
2. Once the token is updated, execute temporary test object creation and deletion to achieve **R2 RUNTIME ACCESS: VERIFIED**.
3. **API Deployment (Render)**: Not yet started.
