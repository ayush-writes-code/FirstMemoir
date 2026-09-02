import { config } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    // TODO(tech-debt): Explicitly deferred for legacy shared files.
    files: ["src/orders.ts"],
    rules: { 
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
];
