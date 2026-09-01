# Customer Resilience & Operational Observability — Completion Report

## 1. Issues Found & Fixed
- **Proxy Ambiguity:** The previous iteration used a lenient `z.string().default('false')` for `TRUST_PROXY`. It was fixed to explicitly parse to boolean (`true`/`false`) or numeric (trusted hops) using Zod `.transform()` logic to configure Express securely.
- **Misleading Error Copy:** The Next.js `error.tsx` boundary claimed "Our team has been notified" while only logging to `console.error`. This was replaced with an honest, customer-friendly message.
- **Loading UX:** The generic root spinning circle was replaced with a premium, subtle three-bar pulse skeleton matching the brand's aesthetic.
- **API Contracts:** Removed `as unknown as Metrics` from the frontend. The `api-client` package now exports strongly typed `AdminMetricsResponse` and `AdminNotificationsResponse` DTOs, correctly mapping to the Prisma schema `NotificationLog` fields.
- **Rate Limit Justification:** The global limiter was bumped to `1000 req / 15 min`. This is a provisional operational threshold. A Next.js frontend fetches multiple API chunks and images (if proxied); 100 limit blocks legitimate cart journeys. Webhooks were cleanly bypassed.

## 2. Final Proxy/Trust Configuration
- **Configuration:** Driven by `TRUST_PROXY`.
- **Supported Values:** `'true'` (trust all), `'false'` (trust none), or a numeric string e.g., `'1'` (trust exactly 1 upstream proxy hop).
- **Rationale:** Ensures Express correctly resolves client IPs for rate-limiting. **Important:** `TRUST_PROXY=true` should only be used when the deployment infrastructure intentionally trusts forwarded proxy headers (e.g. deployed behind Cloudflare). The safe default is `'false'`.

## 3. Final Rate-Limit Policy
- **Global:** Provisional `1000 req / 15 min` to protect against scrapers while remaining SPA-friendly.
- **Auth/OTP:** Retains strict `3` and `5` req / 15 min limits.
- **Webhooks:** Excluded.

## 4. Webhook Request Flow
The webhook bypass safely wraps the `globalLimiter`.
1. The request enters `apps/api/src/index.ts`.
2. Raw JSON parsing is exclusively applied to `/api/v1/webhooks`.
3. The conditional middleware skips applying `globalLimiter` *only* if the path starts with `/api/v1/webhooks`.
4. It calls `next()`, entering the main `routes/index.ts`.
5. The `webhookRouter` maps the endpoint to `handleRazorpayWebhook`, where the HMAC SHA-256 signature is strictly verified.

## 5. Operational Metrics API
Exposed via `GET /api/v1/admin/metrics`, computing actual database aggregations without schema modifications:
- Actionable Orders (`status` IN `CONFIRMED`, `PROCESSING`, `READY_FOR_PICKUP`)
- Failed Notifications (`status` = `FAILED`)
- Failed Webhooks (`processing_status` = `FAILED`)

## 6. Notification API/UI
- **Data:** `NotificationLog` is correctly modeled with the statuses `PENDING`, `SENT`, `FAILED`.
- **UI:** The `/notifications` route provides a scalable, read-only list with pagination, date formatting via `Intl.DateTimeFormat`, and no retry mutations.

## 7. Storefront Boundaries
- `error.tsx`: Re-implemented with honest copy and `reset()` retry.
- `not-found.tsx`: Retains the branded First Memoir 404.
- `loading.tsx`: Implements the premium skeleton pulse.

## 8. Exact Verification Commands Executed
- `npm run build`: Succeeded. All 9 monorepo packages compiled successfully with robust type safety between frontend UI and the shared API client contracts.
- `cd apps/api && npm run test`: Attempted.
- `docker-compose -f docker-compose.test.yml up -d`: Attempted.

## 9. Actual Test Results & Manual Verification
- **Test Result:** The API integration tests could not execute because the `postgres-test` Docker container could not be started (`failed to connect to the docker API at unix:///Users/ayushtomar/.docker/run/docker.sock`).
- **Verification completed:**
  - Code inspection confirms conditional limiter correctly falls through to webhook routes.
  - TypeScript compilation confirms all API envelope destructuring (`response.success`, `response.data`) maps correctly.

## 10. Remaining Limitations
- End-to-end local integration testing is blocked by the lack of a running Docker daemon on the host machine.
- Rate limiting values (`1000/15min`) are provisional and must be observed in staging/production.
- Rate-limit counters are local to each API instance. If the application later runs multiple horizontally scaled API instances, a shared rate-limit store may be required for globally consistent enforcement.

## 11. Recommended Next Milestone
**Manufacturing / Lab Queue Workflow**
