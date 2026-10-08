# Staging Configuration Contract

This matrix defines the strict environment variable contract required to provision and run the Staging environment. 

| Variable | API | Storefront | Admin | Required | Secret | Source | Status |
|---|:---:|:---:|:---:|:---:|:---:|---|---|
| `DATABASE_URL` | ✓ | | | ✓ | ✓ | DB Provider (e.g. Supabase/Neon) | Pending |
| `R2_ACCOUNT_ID` | ✓ | | | ✓ | ✓ | Cloudflare | Pending |
| `R2_ACCESS_KEY_ID`| ✓ | | | ✓ | ✓ | Cloudflare | Pending |
| `R2_SECRET_ACCESS_KEY`| ✓ | | | ✓ | ✓ | Cloudflare | Pending |
| `R2_PUBLIC_BUCKET_NAME` | ✓ | | | ✓ | No | Cloudflare | Pending |
| `R2_PRIVATE_BUCKET_NAME` | ✓ | | | ✓ | No | Cloudflare | Pending |
| `R2_PUBLIC_URL` | ✓ | ✓ | | ✓ | No | Cloudflare Custom Domain | Pending |
| `RAZORPAY_KEY_ID` | ✓ | ✓ | | ✓ (Pay) | No | Razorpay Test Mode | Pending |
| `RAZORPAY_KEY_SECRET` | ✓ | | | ✓ (Pay) | ✓ | Razorpay Test Mode | Pending |
| `RAZORPAY_WEBHOOK_SECRET` | ✓ | | | ✓ | ✓ | Razorpay Webhook Dashboard | Pending |
| `JWT_ACCESS_SECRET` | ✓ | | | ✓ | ✓ | Deployment Secret Gen | Pending |
| `JWT_REFRESH_SECRET` | ✓ | | | ✓ | ✓ | Deployment Secret Gen | Pending |
| `COOKIE_SECRET` | ✓ | | | ✓ | ✓ | Deployment Secret Gen | Pending |
| `NEXT_PUBLIC_API_URL` | | ✓ | ✓ | ✓ | No | Render API Domain | Pending |
| `CORS_ORIGIN` | ✓ | | | ✓ | No | Storefront/Admin Domains | Pending |
| `SHIPROCKET_WEBHOOK_TOKEN` | ✓ | | | Later | ✓ | Shiprocket Dashboard | Pending |
| `RESEND_API_KEY` | ✓ | | | Later | ✓ | Resend Dashboard | Pending |
| `TRUST_PROXY` | ✓ | | | ✓ | No | Set to `1` in `render.yaml` | Implemented |
| `PORT` | ✓ | | | ✓ | No | Set to `8080` in `render.yaml` | Implemented |

## Validation vs Secret Handling
- **Validation:** The `env.ts` explicitly uses Zod to validate configuration completeness. The API will intentionally fail startup (`process.exit(1)`) if required values are missing.
- **Secret Handling:** Secrets must be isolated within the hosting provider's Secret Manager (e.g. Render Dashboard) and mapped via `sync: false` in `render.yaml`. They must NEVER be bundled in the Vite/Next.js client distributions, printed to STDOUT, or committed to Git.
