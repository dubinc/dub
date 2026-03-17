import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  globalSetup: require.resolve("./global-setup"),
  testDir: "./playwright",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "list" : [["html", { open: "always" }]],
  expect: {
    timeout: 30000,
  },
  use: {
    baseURL:
      process.env.PLAYWRIGHT_BASE_URL || "http://partners.localhost:8888",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/partner.json",
      },
      dependencies: ["setup"],
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
