# Changelog

All notable changes to the WePrintIt platform are documented in this file.

---

## [Unreleased] - Milestone: Checkout & Payment Pipeline Complete (2026-08-16)

### Added
- **Full-Stack SKU Management**: Full catalog support for optional `sku` fields across database, Zod schemas, API controllers, DTO mappers, and Admin `ProductForm.tsx`.
- **Razorpay Order Verification on Retry**: Integrated `razorpayService.fetchOrder` during checkout initialization to detect paid/attempted/expired orders and create fresh Razorpay orders dynamically.
- **Atomic Cart Clearing**: Integrated cart item cleanup (`tx.cartLineItem.deleteMany`) inside the payment confirmation database transaction upon successful `payment.captured` webhook.
- **Idempotent Webhook Asset Retention**: Added pre-verification for `UserUpload` existence and idempotent state updates for assets already in `ORDERED_RETAINED`.
- **Automated Test Coverage**: Added comprehensive integration tests in `checkout.integration.test.ts` and `webhook.integration.test.ts` bringing total test suite to 88 passing tests.
- **Project Documentation**: Added `PROJECT_STATE.md` and `DEVELOPMENT_HANDOFF.md` architecture references.

### Fixed
- **Razorpay Stale Order Reuse**: Resolved issue where customers attempting retry after modal closure reused expired/paid Razorpay orders resulting in gateway errors.
- **Checkout Modal UI State**: Fixed checkout button getting permanently stuck on "Processing..." when the payment modal was dismissed or failed.
- **Admin Orders Routing**: Fixed missing order detail route (`/orders/:id`) in Admin router and corrected API client endpoint URL prefixes.
- **Admin Brand Theme Styling**: Fixed Tailwind configuration in Admin app to match brand `#E8620A` colors.
- **Checkout Polling Termination**: Updated `/checkout/success` polling to stop immediately upon receiving any terminal order status.

### Test Summary
- **Total Tests**: 88
- **Passing**: 88 (100%)
- **Failing**: 0
- **Suites**: 17

### Deferred & Blocked Items
- **Shiprocket AWB Generation**: Intentionally held behind `PACKAGE_FULFILLMENT_METRICS_UNDEFINED` pending client definition of packaging dimensions, dead weights, and pickup locations.
