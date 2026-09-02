import { config } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    // TODO(tech-debt): Explicitly deferred for legacy API files to avoid breaking runtime behavior.
    files: [
      "src/controllers/__tests__/admin.manufacturing.integration.test.ts",
      "src/controllers/__tests__/admin.orders.integration.test.ts",
      "src/controllers/__tests__/catalog.integration.test.ts",
      "src/controllers/__tests__/checkout.integration.test.ts",
      "src/controllers/__tests__/final.integration.test.ts",
      "src/controllers/__tests__/webhook.integration.test.ts",
      "src/controllers/admin.orders.controller.ts",
      "src/controllers/cart.controller.ts",
      "src/controllers/category.controller.ts",
      "src/controllers/checkout.controller.ts",
      "src/controllers/order.controller.ts",
      "src/controllers/product.controller.ts",
      "src/controllers/shiprocket.webhook.controller.ts",
      "src/controllers/storage.controller.ts",
      "src/middlewares/error.middleware.ts",
      "src/services/__tests__/pricing.service.test.ts",
      "src/services/__tests__/shiprocket.service.test.ts",
      "src/services/cart.service.ts",
      "src/services/category.service.ts",
      "src/services/checkout.service.ts",
      "src/services/notification/notification.service.ts",
      "src/services/notification/providers/resend.email.provider.ts",
      "src/services/payment.service.ts",
      "src/services/product-options.service.ts",
      "src/services/product.service.ts",
      "src/services/shiprocket.service.ts",
      "src/services/storage/r2.provider.ts",
      "src/utils/jwt.ts"
    ],
    rules: { 
      "@typescript-eslint/no-explicit-any": "off"
    }
  },
  {
    files: [
      "src/controllers/__tests__/admin.manufacturing.integration.test.ts",
      "src/controllers/__tests__/admin.orders.integration.test.ts",
      "src/controllers/__tests__/catalog.integration.test.ts",
      "src/controllers/__tests__/checkout.integration.test.ts",
      "src/controllers/__tests__/customer.orders.integration.test.ts",
      "src/controllers/__tests__/final.integration.test.ts",
      "src/controllers/__tests__/shiprocket.webhook.integration.test.ts",
      "src/controllers/__tests__/webhook.integration.test.ts",
      "src/controllers/admin.orders.controller.ts",
      "src/controllers/shiprocket.webhook.controller.ts",
      "src/controllers/storage.controller.ts",
      "src/controllers/webhook.controller.ts",
      "src/index.ts",
      "src/mappers/product.mapper.ts",
      "src/middlewares/auth.middleware.ts",
      "src/middlewares/error.middleware.ts",
      "src/services/__tests__/shiprocket.service.test.ts",
      "src/services/cart.service.ts",
      "src/services/notification/notification.service.test.ts",
      "src/services/notification/providers/mock.email.provider.ts",
      "src/services/shiprocket.service.ts",
      "src/services/storage/r2.provider.ts",
      "src/utils/response.ts"
    ],
    rules: { 
      "@typescript-eslint/no-unused-vars": "off"
    }
  }
];