# Antigravity Permanent Security, Data Loss Prevention & Operational Guardrails

> [!CAUTION]
> **SECURITY RULES OVERRIDE PERFORMANCE TARGETS. NO SCORE IMPROVEMENT JUSTIFIES DATA LOSS, CUSTOMER-DATA EXPOSURE, PAYMENT-CORRECTNESS REGRESSION, OR UNAUTHORIZED INFRASTRUCTURE CHANGES.**

This document establishes permanent, non-negotiable security, data integrity, and operational safety guardrails for FirstMemoir (formerly WePrintIt). Every AI coding agent (Antigravity, Gemini, Claude, Cursor, Copilot) and human developer working on this codebase **must** read, understand, and strictly follow these rules before executing commands or modifying code.

---

## A. Mandatory Preflight Inspection

Before executing any state-changing command or proposing code modifications:

1. **Inspect Git Status and Working Tree:**
   - Execute `git status --short`, verify the active branch, HEAD commit hash (`git rev-parse HEAD`), and recent commit log (`git log -n 5 --oneline`).
   - Preserve all existing user modifications and untracked files.
   - **Never** run `git reset --hard`, `git clean -fd`, `git checkout -- .`, `git restore .`, or any destructive Git command without explicit, separate authorization.
2. **Review Persistent Documentation:**
   - Read `CURRENT_STATE.md`, `DEVELOPMENT_HANDOFF.md`, and relevant architecture documents in `docs/architecture/` and `docs/development/`.
   - Never assume architectural state or previous task completion; verify with code and configuration evidence.
3. **Environment & Resource Identification:**
   - Positively establish the environment context (Local Development vs. Staging vs. Production).
   - Identify target hosts, API endpoints, database identities, and storage buckets before running scripts or commands.
4. **Action Classification:**
   - Classify planned operations into:
     - **Read-Only / Diagnostic:** Code searches, type-checks, local unit tests, reading reports (Safe to execute autonomously).
     - **Reversible Local Edit:** Scoped component tweaks, CSS styling adjustments, local test additions (Safe within task boundaries).
     - **State-Changing / Infrastructure / Destructive:** Database migrations, R2 ingestion, credential changes, deployment configuration, payment workflow updates (Requires explicit approval gate).
5. **Fail-Closed on Uncertainty:**
   - If resource identity, deployment target, database credentials, or expected system behavior cannot be conclusively verified, **stop immediately** and request clarification. Never guess.

---

## B. Explicit Approval Gates

A separate, explicit user confirmation is **strictly required** before executing any of the following actions. General authorization to "optimize", "fix a bug", or "refactor" does NOT grant authorization for these gates:

1. **Destructive Database Operations:** Running drops, truncates, schema resets, deletes on tables, or raw database manipulation.
2. **Remote Schema Migrations:** Applying Prisma migrations against any remote database (staging or production).
3. **Live Bulk Uploads / Ingestion:** Running R2 asset migration, bulk sync scripts, or live catalog reconciliations.
4. **Storage Object Deletion:** Deleting Cloudflare R2 objects, customer upload files, or preview assets.
5. **Infrastructure & Hosting Changes:** Modifying Vercel project settings, Render service configurations, Neon branch configurations, Cloudflare DNS/routing, or external dashboards.
6. **Credential & Secret Operations:** Rotating, adding, or modifying environment variables, API keys, or access secrets.
7. **Payment & Webhook Logic Modifications:** Changing Razorpay order creation, payment capture webhooks, HMAC signature verification, or order confirmation logic.
8. **Bulk Data Backfills / Irreversible Scripts:** Running scripts that modify multiple records in database or storage.
9. **Git History Rewriting:** Force pushing (`git push -f`), rebasing shared branches, or deleting branches.

---

## C. Secrets & Personal Data Protection

1. **Zero Secret Printing:** Never print, echo, or log secret values, database connection strings, JWT signing keys, payment private keys, or R2 credentials in terminal outputs, chat responses, or markdown artifacts.
2. **Never Read `.env` into Output:** Do not cat or dump `.env`, `.env.local`, or `.env.production.local` files into chat or logs. Use redacted checks (e.g. verifying key presence without printing the value).
3. **Preserve `.gitignore` Boundaries:** Ensure all environment files (`.env*`, except `.env.example`) and local credential caches remain strictly ignored by Git.
4. **Customer Data Anonymization:** Never log or expose customer names, phone numbers, email addresses, delivery addresses, personal photos, or presigned URLs with authentication signatures in test outputs or commit messages.
5. **Responsible Vulnerability Reporting:** If credentials or sensitive data are found in history or files, report the exposure risk immediately without repeating the credential secret in text.

---

## D. Database Integrity & Migration Standards

1. **Prisma Migrate is Mandatory:** All schema changes to `packages/database/prisma/schema.prisma` must be executed via `npm run db:migrate` to produce reviewed, versioned SQL migration files.
2. **Never Use `prisma db push`:** `db push` bypasses migration history, risks silent data loss, and induces schema drift across environments.
3. **Never Reset Remote Databases:** Commands like `db:reset` are strictly guarded by `ALLOW_DB_RESET=true` and must **never** be run against Neon staging or production databases.
4. **Idempotency & Resumability:** Seed and data backfill scripts must be idempotent (using `upsert` or unique lookups) and safely resumable.
5. **No Shortcut Deletions:** Never delete customer records, orders, payments, audit logs, or webhook events to "clean up" or test performance shortcuts.
6. **Immutable Orders & Audit Trails:** `OrderItem` records are permanent snapshots representing the physical and financial agreement at time of purchase. They must never be mutated after confirmation.
7. **Authoritative Backend Pricing:** Order totals and cart line-item amounts are calculated and validated exclusively by backend services; frontend client prices are untrusted display suggestions.
8. **Transaction Boundaries:** State transitions involving orders, payments, cart clearing, and upload asset locking must be executed inside atomic database transactions (`prisma.$transaction`).

---

## E. Storage & Customer Asset Safeguards

1. **Strict Public vs. Private Separation:**
   - **Public Assets (`products/*`):** Static product catalog imagery, publicly accessible via CDN.
   - **Private Assets (`customers/*`, `previews/*`):** Customer uploaded photos and normalized previews. Must remain non-public, un-indexed, and accessible only via authenticated proxy endpoints or short-lived presigned URLs.
2. **Legacy Bucket Protection:**
   - The legacy R2 bucket `weprintit-assets` is strictly off-limits. Never read, write, modify, or delete objects in this bucket without separate, explicitly scoped authorization.
3. **No Unreviewed Overwrites or Bulk Deletes:**
   - Never run recursive deletion commands (`s3:DeleteObjects`, `rm -rf` equivalents) against R2 buckets.
   - Bulk ingestion tools must include dry-run validation, collision detection, and failure reporting.
4. **Preserve Unreferenced Assets:** Never delete customer assets automatically during rollback; retain files for diagnostic review.

---

## F. Payment & Order Invariants

1. **Webhook Authoritative Confirmation:**
   - Only the cryptographically verified Razorpay `payment.captured` webhook is authorized to transition an Order from `PENDING` to `CONFIRMED`.
   - The frontend checkout success callback (`/checkout/success`) is strictly a polling/view state; it **cannot** mark an order confirmed independently.
2. **HMAC-SHA256 Webhook Verification:**
   - Webhook endpoints must validate raw request body signatures against `RAZORPAY_WEBHOOK_SECRET`. Never disable or bypass signature validation.
3. **Idempotent Webhook Processing:**
   - Every webhook event must be recorded in `WebhookEvent` ledger table. Replayed or duplicate event IDs must be acknowledged with 200 OK without re-executing state mutations.
4. **Sandbox / Test Isolation:**
   - Routine testing must use Razorpay Test Key IDs (`rzp_test_*`). Never perform transactions with live production payment credentials.

---

## G. Change Management & Verification

1. **Smallest Viable Diffs:** Prefer narrowly scoped, minimal changes that address verified root causes. Avoid unrelated stylistic refactoring.
2. **Evidence-Driven Execution:** Base optimizations and fixes on reproducible, empirical measurements rather than assumptions.
3. **Mandatory Quality Gates:**
   - Storefront check-types (`npm --workspace=storefront run check-types`) must report 0 errors.
   - Storefront unit and integration tests (`npm --workspace=storefront run test`) must pass 100%.
   - Workspace build checks must succeed cleanly.
4. **No Unrequested Commits or Pushes:** Do not execute `git commit` or `git push` unless explicitly requested by the user.
5. **Audit Documentation:** Document every change, its empirical root cause, test results, and rollback instructions in the project documentation.

---

## H. Failure & Recovery Playbook

1. **Fail-Closed Principle:** When a process fails midway, do not automatically retry non-idempotent operations. Halt, log the error, and inspect the state.
2. **Preserve Error Logs:** Capture complete error stacks and diagnostic evidence before proposing remediation.
3. **Rollback Strategy:** Every change must have a known rollback path (e.g. reverting the specific file diff).
4. **Transparent Reporting:** Never conceal partial failures or report a failed step as a pass. Report exact exit codes, failing tests, and risks clearly.
