import { expect, test as setup } from "@playwright/test";
import { env } from "./env";

const authFile = "playwright/.auth/partner.json";

setup("authenticate as partner", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(env.E2E_PARTNER_EMAIL);
  await page.getByRole("button", { name: "Log in with email" }).click();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await page.locator('input[type="password"]').fill(env.E2E_PARTNER_PASSWORD);
  await page.getByRole("button", { name: "Log in with password" }).click();
  await page.waitForURL((url) =>
    /^\/(programs|onboarding)/.test(new URL(url).pathname),
  );
  await page.context().storageState({ path: authFile });
});
