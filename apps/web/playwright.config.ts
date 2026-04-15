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
    baseURL:
      process.env.PLAYWRIGHT_BASE_URL || "http://partners.localhost:8888",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Partner tests
    {
      name: "partner-setup",
      testMatch: /partners\/auth\.setup\.ts/,
    },
    {
      name: "partners",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/partner.json",
      },
      testDir: "./playwright/partners",
      testIgnore: /(auth\.setup|rbac)(\.spec)?\.ts$/,
      dependencies: ["partner-setup"],
    },
    // Partner RBAC tests
    {
      name: "rbac-setup",
      testMatch: /partners\/rbac-auth\.setup\.ts/,
      use: {
        baseURL: "http://partners.localhost:8888",
      },
    },
    {
      name: "partner-rbac",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://partners.localhost:8888",
      },
      testDir: "./playwright/partners",
      testMatch: /rbac\.spec\.ts/,
      dependencies: ["rbac-setup"],
    },
    // Workspace tests
    {
      name: "workspace-setup",
      testMatch: /workspaces\/auth\.setup\.ts/,
    },
    {
      name: "workspaces",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://app.localhost:8888",
        storageState: "playwright/.auth/workspace.json",
      },
      testDir: "./playwright/workspaces",
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["workspace-setup"],
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
