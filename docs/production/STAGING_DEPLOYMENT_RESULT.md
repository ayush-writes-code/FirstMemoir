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
