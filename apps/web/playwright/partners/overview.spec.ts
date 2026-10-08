import { testIds } from "@/lib/e2e/test-ids";
import { expect, test } from "@playwright/test";
import { env } from "../env";

// The shared partner storage state is a new signup that has not finished
// onboarding, so these tests log in as the seeded partner instead
test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
});

test.describe("Partner All programs Overview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(env.E2E_PARTNER_EMAIL);
    await page.getByTestId(testIds.auth.loginSubmit).click();
    await page.locator('input[type="password"]').fill(env.E2E_PARTNER_PASSWORD);
    await page.getByTestId(testIds.auth.loginSubmit).click();
    await page.waitForURL((url) => new URL(url).pathname === "/overview");
  });

  test("renders every Overview card", async ({ page }) => {
    for (const testId of Object.values(testIds.partnerOverview)) {
      await expect(page.getByTestId(testId)).toBeVisible();
    }
  });

  test("the root path redirects to the Overview", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/overview");
  });
});
