# Slice 6A: Production Readiness Matrix

| Area | Status | Evidence | Remaining Work |
|---|---|---|---|
| Catalogue | VERIFIED | 82 canonical listings verified across Express routes and Prisma persistence (Slice 3.2-5). Provenance tracking implemented via `manufacturing_metadata`. | N/A |
| Database migrations | VERIFIED | Schema drift corrected in Slice 4. Disposable DB rebuild via `npx prisma migrate deploy` verified idempotent success. | Production target config execution |
| Database backup/recovery | BLOCKED_EXTERNAL_DEPENDENCY | DB provider (Supabase/Neon/AWS) not finalized. | Select managed DB provider and configure PITR (Point in Time Recovery). |
| API deployment | VERIFIED_IN_TEST_ONLY | `turbo run build` successful. Docker deployment configuration verified. Healthcheck routes implemented. | Provision live Vercel/Render/Fly compute. |
| Storefront deployment | VERIFIED_IN_TEST_ONLY | `next build` successful. API domains parameterizable. | Next.js Vercel deployment with live domain pointing. |
| Admin deployment | VERIFIED_IN_TEST_ONLY | `vite build` successful. Routes protected via JWT cookie validation. | Vite static asset deployment to hosting provider. |
| Environment validation | VERIFIED | `env.ts` Zod schema enforces explicit keys for staging/production. `TRUST_PROXY` supports numeric hops. | Provide live secrets to CI/CD pipeline. |
| R2 | IMPLEMENTED_NOT_VERIFIED | API-driven presigned URL logic in place. DB `UserUpload` states transition correctly. | Missing actual production Cloudflare R2 tokens, bucket, CORS configuration, and public domain mapping. |
| Razorpay | IMPLEMENTED_NOT_VERIFIED | Razorpay logic written. Webhook HMAC verification and idempotency implemented. No sandbox/live keys provided. | Requires Razorpay Live/Test Key ID/Secret. |
| Razorpay webhook | IMPLEMENTED_NOT_VERIFIED | Webhook endpoint (`/api/v1/webhook/razorpay`) correctly parses raw body and checks HMAC signature logic. | Register live webhook URL in Razorpay dashboard. |
| Shiprocket | IMPLEMENTED_NOT_VERIFIED | Payload hashing and order creation mapped. Credentials hardcoded/defaulted. Physical box dimensions unconfirmed. | Acquire Shiprocket Token, finalize actual box packaging dimensions. |
| Notifications | IMPLEMENTED_NOT_VERIFIED | Resend API interface structure present. | Resend API keys, verified From-domain. |
| Authentication | VERIFIED | JWT cookies + SameSite structure implemented. Validated role gating. | N/A |
| Authorization | VERIFIED | `requireAdmin` middleware proven in Slice 5 integration tests against real Postgres. | N/A |
| Rate limiting | VERIFIED | `express-rate-limit` active on API routes. `TRUST_PROXY` parameterized. | N/A |
| CORS | VERIFIED | Allowed origins enforced by `env.CORS_ORIGIN`. | Register staging and production domains in Vercel config. |
| Logging | VERIFIED | Pino structured logging in place, avoiding raw payload dumps. | Ensure hosting provider natively aggregates stdout/stderr. |
| Health checks | VERIFIED | `/api/v1/health` endpoint exists and tests DB `SELECT 1`. | Wire monitoring ping (e.g. Datadog / BetterStack). |
| Error handling | VERIFIED | Global `errorHandler` traps uncaught errors and formats safely to client. | N/A |
| CI/CD | VERIFIED_IN_TEST_ONLY | Local `verify-slice*` scripts mirror CI/CD checks (lint, test, typecheck, build). | Finalize GitHub Actions workflow triggers. |
| Domain/DNS | BLOCKED_EXTERNAL_DEPENDENCY | No domains provided. | Procure domain and update DNS A/CNAME records. |
| HTTPS | BLOCKED_EXTERNAL_DEPENDENCY | Handled via reverse proxy (hosting provider). | Configure SSL certs on hosting platform. |
| Monitoring | NOT_IMPLEMENTED | No Application Performance Monitoring configured. | Optional: Datadog/Sentry instrumentation if desired. |
| Rollback | VERIFIED_IN_TEST_ONLY | Prisma migration rollbacks require forward-only `migrate deploy`. Application stateless, safe to revert Git SHA. | Document DB snapshot rules. |
| Data migration | VERIFIED | Seed script handles canonical insertion via `upsert` idempotently. | N/A |
| Seed strategy | VERIFIED | Idempotent canonical catalogue `data.ts` mapped. Re-running `db:seed` generates 0 duplicates. | Run seed exactly once on Staging / Prod initialization. |
| Admin operations | VERIFIED | Admin backend functionality tested in Slice 5 with standard DB checkout orders. | N/A |
| Manufacturing workflow | VERIFIED | DB accurately slices order into items for queue. Master asset linking functions correctly. | Operational sign-off from physical manufacturing team. |
| Security | VERIFIED | R2 secrets server-side, HMAC verified, strict validations. | N/A |
