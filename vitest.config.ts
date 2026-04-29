import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "tests/visual/**", "node_modules/**"],
    environmentMatchGlobs: [
      ["tests/unit/components/**", "jsdom"],
      ["**/*.test.tsx", "jsdom"],
    ],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["lib/**/*.ts", "app/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "tests/**"],
    },
  },
});
