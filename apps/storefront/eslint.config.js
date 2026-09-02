import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    files: [
      "app/account/orders/page.tsx",
      "app/checkout/page.tsx",
      "app/checkout/success/page.tsx",
      "src/components/OptionSelector.tsx",
      "src/components/PhotoCropper.tsx"
    ],
    rules: { "@typescript-eslint/no-explicit-any": "off" }
  },
  {
    files: [
      "app/checkout/page.tsx",
      "app/checkout/success/page.tsx",
      "app/page.tsx",
      "src/components/PersonalizationWorkspace.tsx",
      "src/components/PhotoCropper.tsx",
      "src/components/ProductCustomizer.tsx",
      "src/config/mockupCoordinates.ts"
    ],
    rules: { "@typescript-eslint/no-unused-vars": "off" }
  },
  {
    files: [
      "app/cart/page.tsx",
      "src/components/ProductCustomizer.tsx",
      "src/components/ProductLivePreview.tsx"
    ],
    rules: { "@next/next/no-img-element": "off" }
  },
];