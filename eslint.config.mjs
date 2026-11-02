import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Native Android project (Gradle build outputs, generated bridge scripts).
    "android/**",
    // Installed agent skills / tooling, not application source.
    ".opencode/**",
    ".agents/**",
    ".qodo/**",
    "design-system/**",
  ]),
]);

export default eslintConfig;
