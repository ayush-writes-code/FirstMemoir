# Deployment Verification Checklist

*Last updated: September 23, 2026*

This checklist validates the production environment setup for FirstMemoir. Use this document before activating the live catalog and payments.

---

## 1. Engineering Verification (Executable Now)

These checks do not require final business credentials and can be executed by the engineering team to confirm architectural readiness.

### Render API Infrastructure
- [ ] **Build Command**: Verified `npm run build -w api` compiles correctly.
- [ ] **Start Command**: Verified `npm run start -w api` launches correctly via `node dist/index.js`.
- [ ] **Health Endpoint (Live)**: `GET https://firstmemoir-api.onrender.com/api/health/live` returns HTTP 200 `{"status":"ok"}`.
- [ ] **Health Endpoint (Ready)**: `GET https://firstmemoir-api.onrender.com/api/health/ready` returns HTTP 200 (if DB connected) or HTTP 503 (if DB disconnected).
- [ ] **Trust Proxy**: Confirmed `app.set('trust proxy', 1)` is active to capture real client IPs instead of the Render load balancer IP.
- [ ] **Logging**: Confirmed Pino logging outputs structured JSON to `stdout` without local file transports.

### Storefront / API Connectivity
- [ ] **Storefront Env**: `NEXT_PUBLIC_API_URL` is set to `https://firstmemoir-api.onrender.com/api/v1` in Vercel.
- [ ] **CORS Options Request**: `OPTIONS` preflight request from Vercel domain to API successfully returns `Access-Control-Allow-Origin: https://firstmemoir-storefront.vercel.app`.
- [ ] **Prototype Gating**: Verified `PROTOTYPE_CATALOG` falls back to `[]` when `NODE_ENV=production`.

### Database & Migrations
- [ ] **Safe Migrations**: `Dockerfile` executes `npx prisma migrate deploy`. Confirmed NO `prisma db push` or `prisma migrate reset` in deployment.
- [ ] **Schema Compatibility**: Neon DB successfully accepts the latest Prisma schema without dropping existing tables.

### Webhook & Integrations Architecture
- [ ] **Raw Body Parsing**: Confirmed `express.raw` is bound to `/api/v1/webhooks` ensuring Razorpay HMAC signatures are verifiable.
- [ ] **Idempotency Logic**: Confirmed webhook handlers verify `order.status` and silently drop duplicate `payment.captured` events without throwing HTTP 500s.

---

## 2. Client Credentials Required (Blocked)

These steps are completely blocked until the client provides live production configurations or dashboard access.

### Cloudflare R2
- [ ] **CORS Configuration**: Log into Cloudflare Dashboard, navigate to R2 bucket settings, and apply CORS policy allowing `GET/PUT` from `https://firstmemoir-storefront.vercel.app`. (Currently failing preflight).
- [ ] **Custom Domain**: Bind the R2 bucket to `https://cdn.firstmemoir.in`.

### Razorpay Payments
- [ ] **Production Keys**: Inject `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` into Render environment.
- [ ] **Webhook Endpoint Registration**: Add `https://firstmemoir-api.onrender.com/api/v1/webhooks/razorpay` to Razorpay Dashboard.
- [ ] **Webhook Secret**: Inject `RAZORPAY_WEBHOOK_SECRET` into Render.

### Shiprocket Fulfillment
- [ ] **Production Credentials**: Inject `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD` into Render environment.
- [ ] **Webhook Endpoint Registration**: Add `https://firstmemoir-api.onrender.com/api/v1/webhooks/shiprocket` to Shiprocket Dashboard.

### Domain & DNS
- [ ] **Storefront Custom Domain**: Bind `https://firstmemoir.in` in Vercel.
- [ ] **Update CORS Origins**: Update Render `CORS_ORIGIN` env variable to include the new custom domain.
