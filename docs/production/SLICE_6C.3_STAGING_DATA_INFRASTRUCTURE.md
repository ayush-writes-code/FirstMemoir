# Slice 6C.3: Staging Data Infrastructure

## Overview
This document records the state of the Staging Data Infrastructure provisioning phase (Slice 6C.3).

## Status
**BLOCKED**

## Exact Blockers
- **Cloudflare R2**: Cannot programmatically create fresh staging buckets (`firstmemoir-private-uploads` and `firstmemoir-public-assets`), configure CORS, or generate an R2 API token. The local environment lacks the Cloudflare `wrangler` CLI and administrative API keys.
- **Staging PostgreSQL**: Cannot programmatically provision a dedicated staging PostgreSQL database (e.g., via Supabase or Neon). The local environment lacks the respective CLIs and administrative credentials.

These resources must be provisioned manually by the platform administrator.

## Infrastructure Requirements (Pending Manual Action)

### 1. Cloudflare R2
- **Public Bucket**: `firstmemoir-public-assets`
  - Public Access: ENABLED
  - Purpose: `products/*`
- **Private Bucket**: `firstmemoir-private-uploads`
  - Public Access: DISABLED
  - Purpose: `customers/*`, `previews/*`
- **CORS Configuration**: Allow staging storefront origin for direct uploads.
- **R2 API Token**: Scoped read/write access strictly to the two buckets above.

### 2. Staging PostgreSQL
- Dedicated staging database with strong backup/recovery configuration.
- Must provide a valid `DATABASE_URL`.

### 3. Verification & Setup
Once the infrastructure is manually provisioned and credentials securely provided:
- Run Prisma migrations (`npx prisma migrate deploy`).
- Run the idempotent seed.
- Verify catalogue (82 products).
- Perform R2 runtime access tests.

## Legacy Bucket Status
The legacy `weprintit-assets` bucket remains completely untouched. No objects were migrated, modified, or deleted.

## Next Steps
Once the exact blockers are resolved manually, the workflow will resume from the database migration and R2 verification steps before proceeding to API deployment (Slice 6C.4).
