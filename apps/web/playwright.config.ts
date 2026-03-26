import "dotenv-flow/config";

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  globalSetup: require.resolve("./global-setup"),
  testDir: "./playwright",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { outputFolder: "playwright-report" }]]
    : [["html", { open: "always" }]],
  expect: {
    timeout: 30000,
  },
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup-partner",
      testMatch: "**/auth.setup.ts",
    },
    {
      name: "chromium-partners",
      testMatch: /partner.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/partner.json",
        baseURL:
          process.env.PLAYWRIGHT_BASE_URL || "http://partners.localhost:8888",
      },
      dependencies: ["setup-partner"],
    },
    {
      name: "setup-dashboard",
      testMatch: "**/dashboard-auth.setup.ts",
    },
    {
      name: "chromium-dashboard",
      testMatch: /billing-trial\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/dashboard.json",
        baseURL:
          process.env.PLAYWRIGHT_DASHBOARD_BASE_URL || "http://localhost:8888",
      },
      dependencies: ["setup-dashboard"],
    },
  ],
  webServer: process.env.CI
    ? {
        command: "pnpm start -p 8888",
        port: 8888,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
