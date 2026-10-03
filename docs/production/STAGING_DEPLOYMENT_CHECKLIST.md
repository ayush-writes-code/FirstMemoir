# Staging Deployment Checklist

This document is the authoritative sequence required to provision the Staging Environment. Execute these sequentially.

### 1. Pre-Deployment Configuration
- [ ] Provision staging Postgres database (e.g., Supabase, Neon)
- [ ] Configure DB Provider for Point-In-Time-Recovery (PITR)
- [ ] Execute `npx prisma migrate deploy` locally pointing to staging `DATABASE_URL`
- [ ] Execute `npm run db:seed` locally pointing to staging `DATABASE_URL`
- [ ] Validate exactly 82 products are safely imported natively in the database
- [ ] Provision Cloudflare R2 staging bucket and extract IAM Keys
- [ ] Generate staging Razorpay Test Keys (Sandbox) and configure webhook callback
- [ ] Configure Shiprocket Sandbox/Staging token

### 2. Environment Variables Injection
- [ ] Apply `STAGING_CONFIGURATION.md` variables to API Host (Render)
- [ ] Apply `STAGING_CONFIGURATION.md` variables to Storefront Host (Vercel)
- [ ] Apply `STAGING_CONFIGURATION.md` variables to Admin Host (Vercel)

### 3. Deploy Phase
- [ ] Trigger API build (`firstmemoir-api` on Render)
- [ ] Verify API startup health check (`/api/v1/health`) via cURL returns 200
- [ ] Trigger Storefront Next.js build
- [ ] Trigger Admin Vite React build
- [ ] Verify hosting log tail shows clean execution and zero secret leakage

### 4. Operational Smoke Test
- Execute the **Sandbox Smoke Test** defined in `PRODUCTION_SMOKE_TEST_PLAN.md`.

### 5. Rollback
- If failure occurs, execute **Rollback Plan** (`ROLLBACK_PLAN.md`).
