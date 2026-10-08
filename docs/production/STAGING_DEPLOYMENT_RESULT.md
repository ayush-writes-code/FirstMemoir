# Staging Deployment & End-To-End Verification Result

## STAGING STATUS
STAGING BLOCKED

## VERIFIED
- API architecture and environment configuration locally.
- R2 upload, processing, and preview extraction logic locally.
- Razorpay Webhook HMAC verification and idempotency processing locally.
- Cart and checkout authoritative backend pricing locally.
- `render.yaml` schema structure.
- Local regression test stability.
- Repository configuration contracts.

## NOT VERIFIED
- Remote Staging Database Migrations (No connection string).
- API deployment (Render service un-provisioned).
- Live Razorpay Checkout (No Sandbox credentials).
- Live R2 Uploads (No R2 tokens available).
- Webhook Delivery (Razorpay cannot reach localhost/un-provisioned API).

## BLOCKERS
- **Render API Instance:** The Express API has not been provisioned on Render.
- **Staging Database:** A dedicated staging PostgreSQL database (e.g. Neon, Supabase) must be provisioned and its connection string provided.
- **R2 Credentials:** Cloudflare R2 Account ID and API tokens are missing from the staging environment variables.
- **Razorpay Sandbox:** Test mode `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` are not supplied.
- **Vercel API URL:** The deployed `firstmemoir-demo.vercel.app` is currently pointing `NEXT_PUBLIC_API_URL` to `http://localhost:3001/api/v1` and requires an update to the actual Render API URL once deployed.

## R2 SECURITY FINDING
- **Finding:** The current Cloudflare R2 bucket (`weprintit-assets`) has public access enabled globally. Because Cloudflare R2 does not support directory-level permissions natively, objects inside the `customers/` prefix are inherently public. Although the backend does not expose `master_file_key` to the storefront during cart/checkout, the `requestUploadUrl` endpoint returns the `file_key` (e.g., `customers/<timestamp>-<uuid>.jpg`) to the browser so the client can perform the PUT request. Anyone intercepting this response (or the browser user themselves) could construct the public URL and access the raw customer master upload.
- **Recommendation:** Do not use a single mixed bucket. Provision two separate buckets: 
  1. `firstmemoir-public-assets` (Public access enabled: for `products/` and `previews/`)
  2. `firstmemoir-private-uploads` (Public access disabled: for `customers/` master uploads, accessible only via API presigned URLs).
  The environment schema (`env.ts`) and `r2.provider.ts` will need to be updated to support two distinct bucket variables (`R2_PUBLIC_BUCKET_NAME` and `R2_PRIVATE_BUCKET_NAME`).

## RAZORPAY TEST RESULT
- **Implementation:** VERIFIED locally. Webhook HMAC verification and idempotency logic are structurally sound and separate from each other.
- **Sandbox:** BLOCKED (Requires actual credentials and a reachable staging API).
- **Production:** NOT IN SCOPE.

## DEPLOYED URLS
- **Storefront:** https://firstmemoir-demo.vercel.app (Note: API calls currently failing due to `localhost` binding).
- **API:** BLOCKED (Pending Render deployment).
- **Admin:** BLOCKED (Pending deployment).

## DATABASE
- **Migration:** BLOCKED (No staging DB).
- **Seed:** BLOCKED (No staging DB).
- **82-product verification:** BLOCKED (No staging DB).

## FILES/DOCS UPDATED
- `docs/production/STAGING_DEPLOYMENT_RESULT.md` (Created)
- `CURRENT_STATE.md` (Updated)

## COMMIT
- `chore(production): audit staging deployment blockers and r2 security`

## Slice 6C.1 Security and Idempotency Remediation
**R2 Access Model**: Updated to a strict two-bucket architecture. `customers/` master uploads are routed to `R2_PRIVATE_BUCKET_NAME` ensuring they are not publicly retrievable even if the file key is known. `products/` and `previews/` remain in `R2_PUBLIC_BUCKET_NAME`.
**Upload Authorization Model**: Verified that `requestUploadUrl` issues a secure, signed `cart_session` HttpOnly cookie. The `uploadComplete` endpoint explicitly enforces that only the exact `sessionId` that originated the upload can mark it as ready, preventing enumeration and completion spoofing.
**Webhook Retry/Idempotency**: Verified that `payment.captured` webhooks create a `WebhookEvent` idempotency lock *inside* the main transaction. If any database or infrastructure error occurs, the transaction rolls back, which destroys the `WebhookEvent`, perfectly preserving the ability for Razorpay to retry the event. Duplicate successful events return 200 OK.
**Checkout Initialization Behavior**: Verified that `initializeCheckout` is perfectly idempotent. Repeated initialization requests identify existing `PENDING` orders, fetch their Razorpay status, and idempotently return the existing `razorpay_order_id` if it is valid and unpaid, preventing duplicate Razorpay orders.
**Upload Failure Recovery**: Verified that if the Razorpay order creation (which happens outside the transaction) fails, the checkout service safely catches the error, marks the local order `EXPIRED`, and explicitly transitions all locked uploads back to `CART_ATTACHED`, preventing upload stranding.
**Tests Added**: Added `slice6c1.integration.test.ts` to verify bucket routing, session isolation, and transaction rollback mechanics.
**Remaining Staging Blockers**: Render API Instance, Staging PostgreSQL Database, Cloudflare R2 Credentials (now two buckets), Razorpay Sandbox Credentials, Vercel API URL binding.
