import { expect, test } from "@playwright/test";
import { env } from "./env-dashboard";

const authFile = "playwright/.auth/dashboard.json";

test("log in to dashboard app", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: "Log in to your Dub account" }),
  ).toBeVisible();

  await page.locator('input[name="email"]').fill(env.E2E_DASHBOARD_EMAIL);
  await page.getByRole("button", { name: "Log in with email" }).click();

  await expect(page.locator('input[type="password"]')).toBeVisible();
  await page.locator('input[type="password"]').fill(env.E2E_DASHBOARD_PASSWORD);
  await page.getByRole("button", { name: "Log in with password" }).click();

  await page.waitForURL((url) => !/\/login/.test(new URL(url).pathname), {
    timeout: 30_000,
  });

  await page.context().storageState({ path: authFile });
});
