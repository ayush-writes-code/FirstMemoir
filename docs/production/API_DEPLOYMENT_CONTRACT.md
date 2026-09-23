# API Production Deployment Contract

*Last updated: September 23, 2026*

This contract defines the strict requirements for deploying the FirstMemoir Express/Node API to production (e.g. Render, Railway, or AWS).

## 1. Environment Variables

The production environment MUST supply the following exact keys. Fake or test credentials are strictly forbidden.

| Variable | Description | Source | Status |
|---|---|---|---|
| `NODE_ENV` | Must be strictly `production` | Deployment Platform | - |
| `PORT` | Dynamic port provided by host | Deployment Platform | - |
| `DATABASE_URL` | PostreSQL connection string | Neon / RDS | **REQUIRED** |
| `STOREFRONT_URL` | Target origin for CORS (e.g. `https://firstmemoir.in`) | Vercel | **REQUIRED** |
| `CLOUDFLARE_R2_ACCOUNT_ID` | Cloudflare account ID | Cloudflare | **REQUIRED** |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | R2 Bucket Access Key | Cloudflare | **REQUIRED** |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY`| R2 Bucket Secret Key | Cloudflare | **REQUIRED** |
| `CLOUDFLARE_R2_BUCKET_NAME` | Name of the bucket (e.g. `firstmemoir-prod`) | Cloudflare | **REQUIRED** |
| `CLOUDFLARE_R2_PUBLIC_URL` | Public routing domain (e.g. `https://cdn.firstmemoir.in`) | Cloudflare | **REQUIRED** |
| `RAZORPAY_KEY_ID` | Live Razorpay Key | Razorpay Dashboard | **BLOCKED** (Pending KYC) |
| `RAZORPAY_KEY_SECRET` | Live Razorpay Secret | Razorpay Dashboard | **BLOCKED** (Pending KYC) |
| `RAZORPAY_WEBHOOK_SECRET` | Secret used to sign incoming webhook events | Razorpay Webhook | **BLOCKED** (Pending KYC) |
| `SHIPROCKET_EMAIL` | Production account email | Shiprocket | **BLOCKED** |
| `SHIPROCKET_PASSWORD` | Production account password | Shiprocket | **BLOCKED** |
| `JWT_SECRET` | Cryptographically secure random string | Generated (e.g. `openssl rand -hex 64`) | **REQUIRED** |

## 2. Infrastructure Requirements

- **CORS Configuration**: The Express API must configure `cors({ origin: process.env.STOREFRONT_URL, credentials: true })`.
- **Trust Proxy**: Because the API is behind a PaaS load balancer (Render/Vercel), `app.set('trust proxy', 1)` is required to parse client IPs correctly.
- **Raw Webhook Bodies**: Razorpay requires the raw, unparsed body to verify the SHA256 signature. Ensure the body parser middleware preserves the raw buffer on `/api/webhooks/razorpay`.
- **Cookie Settings**: JWT cookies must be issued with `Secure: true`, `HttpOnly: true`, and `SameSite: 'lax'` or `'none'` depending on subdomain layout.

## 3. Database Migration Strategy

1. The deployment pipeline must execute `npx prisma migrate deploy`.
2. Do **NOT** execute `npx prisma db push` or `prisma migrate reset` in the production CI/CD.
3. The catalog is hydrated post-migration via the Catalog Import Script, not a Prisma seed file.

## 4. Health & Observability

- **Health Check Endpoint**: `GET /health` must return `200 OK` and should be pinged by the PaaS load balancer to verify container readiness.
- **Logs**: All logs go to `stdout`/`stderr`. No local file transports.
