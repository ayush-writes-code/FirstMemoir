# Client UI Demo Configuration (Temporary)

*Status: ACTIVE (Deployed)*
*Last updated: September 23, 2026*

## Purpose
This environment is a **purely visual, frontend-only demonstration** of the FirstMemoir storefront for client review. 

The primary objective is to allow the client to review their products, brand aesthetic, and typography in the context of the website's UI/UX.

## Critical Non-Production Disclaimers
1. **This is NOT a functional e-commerce environment.**
2. **There is NO backend API.** The Next.js frontend has been temporarily decoupled from the API (`apps/api`), the database (Neon PostgreSQL), and Cloudflare R2.
3. **No Database Contamination:** We did not insert the prototype catalog into the staging database. This protects the integrity of the data architecture.
4. **Mock Add to Cart:** The "Add to Cart" button on these prototype products will show a visual success message locally, but it does NOT interact with a real cart, checkout, or payment gateway (Razorpay). 

## Technical Configuration
- **Host:** Vercel
- **Project Name:** `firstmemoir-demo`
- **Application deployed:** `apps/storefront` ONLY.
- **Data Source:** Static `PROTOTYPE_CATALOG` (`apps/storefront/src/lib/prototype-data.ts`) loaded with the optimized listing assets from Phase 3.1.
- **Environment Gating:** Driven entirely by `NEXT_PUBLIC_DEMO_MODE=true`, which forces the prototype catalog to render even in `NODE_ENV=production`.
- **Missing Prices:** Products with placeholder or missing prices in the source data will display "Price coming soon" rather than hallucinated or fake prices.

## URL
- **Vercel Project:** https://firstmemoir-demo.vercel.app (or custom Vercel domain generated on deployment)

## Restore/Resume Strategy
Once the visual demo is approved and the client requests functional commerce features:
1. Re-enable the API integration in `apps/storefront/app/products/page.tsx` and `apps/storefront/src/lib/prototype-data.ts`
2. Resume the Render API Deployment pipeline detailed in `CLIENT_DEMO_API_DEPLOYMENT_PLAN.md`
3. Migrate the approved products from the prototype catalog into the Neon Database with confirmed selling prices and dimensions.
