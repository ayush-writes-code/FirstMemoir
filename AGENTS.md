# AI Agent Operating Instructions & Security Rules

> [!CAUTION]
> **MANDATORY SECURITY DIRECTIVE FOR ALL AI CODING AGENTS (Antigravity, Gemini, Claude, Cursor, Copilot):**
> Before reading code or proposing/executing any modifications, you **must** read and adhere to:
> [`docs/security/ANTIGRAVITY_SECURITY_RULES.md`](./docs/security/ANTIGRAVITY_SECURITY_RULES.md)
>
> **SECURITY RULES OVERRIDE PERFORMANCE TARGETS. NO SCORE IMPROVEMENT JUSTIFIES DATA LOSS, CUSTOMER-DATA EXPOSURE, PAYMENT-CORRECTNESS REGRESSION, OR UNAUTHORIZED INFRASTRUCTURE CHANGES.**

## Key Invariants Summary

1. **Preflight:** Inspect `git status --short`, branch, HEAD, and preserve user working tree changes. Never run destructive Git commands (`git reset --hard`, `git clean`, etc.).
2. **Approval Gates:** Obtain explicit approval before any remote schema migration, database modification, R2 bulk upload/deletion, credential rotation, or infrastructure changes.
3. **Database Integrity:** Prisma Migrate is mandatory. Never use `prisma db push`. Never reset or seed remote databases. Orders, payments, and audit tables are immutable.
4. **Storage Separation:** Maintain strict boundary between public `products/*` assets and private `customers/*` / `previews/*` uploads. Never touch legacy `weprintit-assets` bucket.
5. **Payment Safety:** Razorpay `payment.captured` webhook with verified HMAC-SHA256 signature is the sole authoritative confirmation of an order. Client callbacks never confirm orders.
6. **Zero Secrets:** Never print, commit, or log API keys, database URLs, or customer personal information.
