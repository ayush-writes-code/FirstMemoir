# FirstMemoir — Master Delivery Plan

*Authoritative Operational & Delivery Roadmap toward Production*  
*Last updated: October 2, 2026*  

*Delivery Philosophy: ITERATIVE PRODUCT DELIVERY. One active slice at a time. DEFINE SLICE → IMPLEMENT → LOCAL QA → DEPLOY → CLIENT REVIEW → FEEDBACK → ACCEPT/REVISE → COMPLETE SLICE → NEXT SLICE.*

---

## 1. Documentation Rule

Keep **ONLY** these authoritative execution documents:
- `docs/production/MASTER_DELIVERY_PLAN.md` (This document)
- `docs/production/CLIENT_FEEDBACK_LOG.md`
- `CURRENT_STATE.md`

Historical phase documents remain historical evidence. Do not create another roadmap document unless genuinely necessary. Update the master plan after each completed slice.

---

## 2. Definition of Done

Every slice must produce:
1. Scope
2. Acceptance criteria
3. Implementation
4. Local verification
5. Deployment
6. Public/staging URL where applicable
7. Verification evidence
8. Client feedback
9. Feedback classification
10. Completion status
11. Documentation update
12. Git commit

*Never mark a slice complete merely because code compiles.*

---

## 3. Current Active Slice

**SLICE 1 — CLIENT VISUAL EXPERIENCE REVIEW**

The client-facing URL is:
[https://firstmemoir-demo.vercel.app](https://firstmemoir-demo.vercel.app)

**Current Action:**
DO NOT implement a new feature yet.
The immediate workflow is:
1. Send client the URL.
2. Collect feedback.
3. Record feedback in `CLIENT_FEEDBACK_LOG.md`.
4. Classify each item.
5. Create Slice 1B from approved feedback.
6. Implement.
7. Deploy.
8. Get client confirmation.
9. Then begin Slice 2.

*While waiting for client feedback, engineering may prepare supporting artifacts/tooling, but MUST NOT perform speculative UI redesign, database mutation, full catalog import, or production infrastructure deployment.*

---

## 4. Delivery Slices

### SLICE 1: CLIENT VISUAL EXPERIENCE REVIEW
- **Status:** ACTIVE
- **Scope:** Present Home, navigation, Shop, PDP, mobile experience, and typography to the client via a storefront-only public Vercel demo without database dependencies.
- **Goal:** Client reviews the visual direction and layout. Wait for actual client feedback. Do not modify the UI spec based on assumptions.

### SLICE 1B: CLIENT FEEDBACK IMPLEMENTATION
- **Status:** PENDING CLIENT FEEDBACK
- **Scope:** Implement only approved/high-confidence feedback recorded and classified in `CLIENT_FEEDBACK_LOG.md`.
- **Workflow:** Typecheck → lint → build → focused tests → deploy Vercel → verify → send updated URL → mark feedback resolved.

### SLICE 2: REAL CATALOG PILOT
- **Status:** PENDING
- **Scope:** Select 5–10 real products. For each pilot product, require ONLY the business data needed for the actual functionality being tested (approved product name, category, approved imagery, verified price, product/variant structure, SKU or approved SKU-generation rule).
- **Import Lifecycle:** RAW SOURCE → NORMALIZE → CLIENT APPROVAL → DRY RUN → DIFF REVIEW → EXPLICIT APPLY → DB VERIFICATION → STOREFRONT VERIFICATION.
- **Rule:** Never automatically mutate the DB. Never truncate/reset staging/production to perform an import. Do not invent missing business data.

### SLICE 3: REAL COMMERCE PILOT
- **Status:** PENDING
- **Scope:** Full checkout flow for one or a very small number of approved real products.
- **Flow:** DB product → PDP → options → backend-authoritative price → cart → checkout → Razorpay TEST → webhook → order confirmation → admin order.
- **Acceptance:** Browser cannot independently confirm payment; webhook is authoritative; immutable order snapshot exists; admin sees order; no fake success state exists on the real commerce path.

### SLICE 4: PERSONALIZATION
- **Status:** PENDING
- **Scope:** Only products explicitly confirmed as customizable.
- **Flow:** Upload → validation → crop → preview → quality/DPI → save → cart → checkout → immutable manufacturing snapshot.
- **Rule:** Do not expose personalization to fixed-art products unless the business explicitly requires it.

### SLICE 5: ADMIN + MANUFACTURING
- **Status:** PENDING
- **Scope:** Verify order visibility, manufacturing queue, item details, production state, required customer asset access, completion workflow, and notification triggers.

### SLICE 6: SHIPPING + TRACKING
- **Status:** PENDING
- **Scope:** Verify Shiprocket, AWB, shipment, webhook, order status, customer tracking, and failure handling.
- **Rule:** Only after real packaging data is available. Keep dry-run mode until live credentials are explicitly approved.

### SLICE 7: FULL CATALOG
- **Status:** PENDING
- **Scope:** Import remaining products through the same safe pipeline.
- **Prerequisites:** Pilot approved, product model proven, grouping approved, prices approved, SKU strategy approved, imagery approved.

### SLICE 8: CLIENT PRODUCTION INFRASTRUCTURE
- **Status:** PENDING
- **Scope:** Provision separate client-owned infrastructure: GitHub, Vercel, Render, PostgreSQL, Cloudflare/R2, Razorpay LIVE, Shiprocket LIVE, DNS/domain.
- **Rule:** Only when product functionality is sufficiently approved. Do not destroy or repurpose current development resources.

### SLICE 9: PRODUCTION HARDENING
- **Status:** PENDING
- **Scope:** Verify security, auth, authorization, secrets, CORS, cookies, rate limits, webhooks, DB migrations, backups, monitoring, payment reconciliation, refund/cancellation behavior, shipping failures, notification failures, SEO, accessibility, legal pages, analytics, performance.

---

## FINAL RULE

**STOP OPTIMIZING THE ARCHITECTURE. START SHIPPING THE PRODUCT.**

The success metric is not number of audits, documents, migrations, or architecture reports.

The success metric is:
**CLIENT-APPROVED PRODUCT → REAL DATA → REAL COMMERCE → REAL FULFILLMENT → PRODUCTION → LAUNCH.**
