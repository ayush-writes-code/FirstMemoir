import { config } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    // TODO(tech-debt): Explicitly deferred for legacy API client files.
    files: [
      "src/client.ts",
      "src/endpoints/admin.ts",
      "src/endpoints/products.ts",
      "src/types.ts"
    ],
    rules: { 
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
];