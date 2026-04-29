import { defineConfig, devices } from "@playwright/test";
import { TEST_DB_PATH, TEST_MASTER_KEY } from "./tests/e2e/test-db-path";

const lighthouseEnabled = process.env.LIGHTHOUSE === "1";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3210",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "e2e",
      testDir: "./tests/e2e",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "visual",
      testDir: "./tests/visual",
      snapshotPathTemplate: "tests/visual/__screenshots__/{testFilePath}/{arg}{ext}",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        colorScheme: "dark",
      },
      expect: {
        toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
      },
    },
    ...(lighthouseEnabled
      ? [
          {
            name: "lighthouse",
            testDir: "./tests/lighthouse",
            use: { ...devices["Desktop Chrome"] },
          },
        ]
      : []),
  ],
  webServer: {
    command:
      process.env.PW_DEV === "1"
        ? "pnpm dev --port 3210"
        : "pnpm build && pnpm exec next start -p 3210",
    url: "http://localhost:3210/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      TEST_DATABASE_PATH: TEST_DB_PATH,
      MASTER_KEY: process.env.MASTER_KEY ?? TEST_MASTER_KEY,
      // Tests run a prod-built server over HTTP loopback. Drop Secure +
      // `__Host-` prefix so chromium will store the CSRF cookie. The
      // PUBLIC_ mirror is needed at build time so the client bundle uses the
      // matching cookie name when reading via document.cookie.
      TEST_INSECURE_COOKIES: "1",
      NEXT_PUBLIC_TEST_INSECURE_COOKIES: "1",
      // Suppress Next.js telemetry/noise in tests.
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
