import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv-flow";

loadEnv({
  silent: true,
});

const workspaceBaseURL = "http://localhost:8888";
const partnersBaseURL = "http://partners.localhost:8888";

export default defineConfig({
  globalSetup: require.resolve("./global-setup"),
  testDir: "./playwright",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  // Local .env often sets CI=true for other tooling; only pin to 1 worker on Actions.
  workers: process.env.GITHUB_ACTIONS ? 1 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { outputFolder: "playwright-report" }]]
    : [["html", { open: "always" }]],
  expect: {
    timeout: 30000,
  },
  use: {
    baseURL: workspaceBaseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // API tests (Bearer token seeded in globalSetup)
    {
      name: "api",
      testDir: "./playwright/api",
      fullyParallel: true,
      use: {
        baseURL: workspaceBaseURL,
      },
    },
    // Partner tests
    {
      name: "partner-setup",
      testMatch: /partners\/auth\.setup\.ts/,
      use: {
        baseURL: partnersBaseURL,
      },
    },
    {
      name: "partners",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: partnersBaseURL,
        storageState: "playwright/.auth/partner.json",
      },
      testDir: "./playwright/partners",
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["partner-setup"],
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
        storageState: "playwright/.auth/workspace.json",
      },
      testDir: "./playwright/workspaces",
      testIgnore: /auth\.setup\.ts|billing-trial\.spec\.ts/,
      dependencies: ["workspace-setup"],
    },
    // Billing tests — runs after workspace onboarding so the workspace exists
    {
      name: "chromium-workspace",
      testMatch: /workspaces\/billing-trial\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/workspace.json",
      },
      dependencies: ["workspaces"],
    },
  ],
  webServer: process.env.CI
    ? {
        command: "pnpm start -p 8888",
        port: 8888,
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: "ignore",
      }
    : undefined,
});
