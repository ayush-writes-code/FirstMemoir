# FirstMemoir — Client Feedback Log

*Authoritative log of all client review sessions, feedback items, and their classifications.*
*Last updated: October 2, 2026*

---

## Feedback Classification Taxonomy

Every piece of client feedback must be recorded and classified as exactly one of:

| Classification | Definition | Handling Rule |
|---|---|---|
| **BUG** | Defects where implementation violates an accepted specification or produces an error. | P0/P1 — Fix immediately in the current slice. |
| **UX CHANGE** | Adjustments to usability, interaction ergonomics, or flow clarity without altering business logic. | Evaluate impact; schedule in immediate or next slice. |
| **DESIGN CHANGE** | Visual styling adjustments (typography, color, spacing, asset framing). | Require concrete rationale; do not enter endless redesign loops. |
| **BUSINESS RULE** | Directives on pricing, packaging, shipping rates, discounts, returns, or order limits. | Record as policy; adjust backend validation and schemas accordingly. |
| **CONTENT CHANGE** | Text, legal copy, marketing headlines, or product descriptions. | Implement via standard content updates without architecture changes. |
| **CATALOG DATA** | Client-supplied prices, SKUs, dimensions, weights, or product options. | Ingest into manifest through the Safe Catalog Lifecycle. |
| **OUT OF SCOPE** | Requests outside consumer web storefront, admin, or existing project scope. | Log and defer to future phases or post-launch roadmap. |

---

## Review Sessions

### Session 0 — Initial Visual Prototype Deployment (September 28, 2026)
- **Target URL:** `https://firstmemoir-demo.vercel.app`
- **Environment:** Vercel Demo (`NEXT_PUBLIC_DEMO_MODE=true`), Storefront Only
- **Scope:** Public storefront mobile-first layout, Home page, Shop grid (`/products`), and Product Detail Pages (`/products/[slug]`) with 10 representative prototype items.
- **Client Feedback Status:** Pending initial client walk-through.

| # | Feedback Item | Category | Target Slice | Status | Notes |
|---|---|---|---|---|---|
| 0.1 | *Awaiting initial client feedback on demo URL* | PENDING | Slice 1 | OPEN | Client provided with `https://firstmemoir-demo.vercel.app`. |

---

## Instructions for Logging New Feedback
When client feedback is received:
1. Append an entry to the table above.
2. Assign the exact classification (`BUG`, `UX CHANGE`, `DESIGN CHANGE`, `BUSINESS RULE`, `CONTENT CHANGE`, `CATALOG DATA`, `OUT OF SCOPE`).
3. Assign the target delivery slice (`Slice 1`, `Slice 2`, etc.).
4. Cross-reference the item in `docs/production/MASTER_DELIVERY_PLAN.md` under Section K.
