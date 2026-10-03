# Rollback Plan

This document defines the strict procedures for rolling back the application or database during a failed deployment.

## Application Rollback
Because the API, Admin, and Storefront applications are stateless, rolling back the application layer strictly means reverting to the previous known-good Git SHA on the deployment provider (e.g. Vercel / Render "Rollback" button).
- Ensure environment variables are not rolled back out-of-sync with the application code.

## Database Migration Rollback
The Prisma schema relies on a forward-only `migrate deploy` methodology. 
- **DO NOT** attempt to manually `migrate down` or drop tables locally via `db push`.
- If a migration introduces data corruption or breaking schema changes, the database MUST be recovered using the database provider’s **Point-In-Time-Recovery (PITR)** mechanism. 
- During a PITR rollback, the application must simultaneously be rolled back to the Git SHA corresponding to the pre-migration state.

## Failed Deployment Behavior
If the API fails to boot, the global healthcheck will fail, preventing the deployment provider from routing live traffic to the broken instance. The old instance will remain active.
- Review server startup logs to identify missing environment variables.
- Update the environment variables in the provider dashboard and trigger a re-deploy.

## Webhook Rollback
If a webhook processing bug is deployed and corrupts incoming payment or shipment data:
- Application code must be rolled back immediately.
- Corrupted database rows must be audited and manually corrected via secure database access or Admin API (no automated webhook rollback exists).
- Razorpay supports re-firing webhooks from their dashboard if an event was missed during a downtime window.

## Data Corruption Response
If accidental mass data mutation occurs:
1. Immediately scale down the API layer to stop further mutation.
2. Disable the Razorpay webhook endpoint in the Razorpay dashboard.
3. Initiate a database PITR restoration.
4. Scale up the API layer once the restore completes.
5. Manually verify the state of pending orders.

## What MUST NOT Be Rolled Back Independently
- **API and Storefront Checksums:** The storefront relies strictly on API contracts. Do not roll back the API without rolling back the Storefront if a breaking DTO change occurred.
- **R2 Assets:** User-uploaded master assets in R2 should never be rolled back or deleted in bulk, as they are immutable and tied directly to physical fulfillment obligations.
