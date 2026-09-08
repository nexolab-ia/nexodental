import js from "@eslint/js";
import next from "eslint-config-next/core-web-vitals";
export default [js.configs.recommended, ...next, { files: ["**/*.{ts,tsx}", "e2e/**/*.ts"], rules: { "no-unused-vars": "off" } }];
