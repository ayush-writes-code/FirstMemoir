# Production Smoke Test Plan

This document outlines the minimal post-deployment verification sequence required after deploying to any environment.

## Sandbox/Staging Smoke Test
This test should be run immediately after deploying to a non-production integration environment (using Sandbox Razorpay/Shiprocket credentials).

1. **Storefront Initialization:** Verify the storefront URL loads securely over HTTPS without certificate warnings.
2. **Catalogue Render:** Navigate to `/products`. Verify 82 products load with images gracefully.
3. **Product Details:** Open a standard product (e.g. `FM-FRM-POR-GT3`). Verify title, dimensions, and estimated price display properly.
4. **Cart Addition:** Add the standard product to the cart. Verify cart total natively reflects the backend base price.
5. **Checkout Initialization:** Submit a dummy shipping address and initialize checkout.
6. **Razorpay Modal (Sandbox):** Ensure the Razorpay modal opens dynamically. Verify the amount explicitly matches the cart total.
7. **Sandbox Payment Completion:** Complete a test payment using Razorpay's designated "Success" test card.
8. **Authoritative Webhook Confirmation:** Ensure the backend `payment.captured` webhook successfully triggers, authenticates the HMAC, transitions the order to `CONFIRMED`, and locks any associated upload retention statuses to `ORDERED_RETAINED`. (Do NOT trust the frontend success callback independently).
9. **Admin Visibility:** Log into the Admin UI via `/admin`. Verify the newly confirmed order exists.
10. **Manufacturing Queue:** Open the Manufacturing Queue. Verify the order items are correctly mapped with expected SKU and quantities.
11. **R2 Integrity:** Create a test personalized product order. Upload a dummy image. Confirm browser PUT directly to R2 succeeds, order finalizes, and master asset is secured (not leaking publicly).
12. **Health Check:** Ping `/api/v1/health` and verify HTTP 200 (database connected).
13. **Log Audit:** Check the backend server logs via hosting provider to ensure no secrets or environment variables were printed during the flow.

## Production Smoke Test
This test must be performed in the live production environment immediately after a release using live credentials.

1. **Storefront Verification:** Ensure storefront loads accurately under the live custom domain.
2. **Catalogue Validation:** Confirm exactly 82 products are listed and canonical prices match the internal reference exactly.
3. **Standard Cart Validation:** Add a standard product to cart. Proceed to checkout initialization.
4. **Live Gateway Check:** Verify Razorpay modal initializes in Live Mode (amount in INR, real payment methods). Close the modal without paying.
5. **Admin Access Check:** Log into the Admin dashboard. Ensure no phantom orders exist, or only legitimate `PENDING` ones.
6. **Database Connection Health:** Ping `/api/v1/health` to confirm persistent live DB connectivity.
7. **Log Safety Validation:** Audit live logs for 5 minutes post-deployment to guarantee zero credential/secret spillage and zero unexpected startup exceptions.
