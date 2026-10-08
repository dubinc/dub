import { testIds } from "@/lib/e2e/test-ids";
import { expect, test } from "@playwright/test";
import { env } from "../env";

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
});

test.describe("Partner Login", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByTestId(testIds.auth.loginHeading)).toBeVisible();

    await expect(page.locator('input[name="email"]')).toBeVisible();

    await expect(page.getByTestId(testIds.auth.loginSubmit)).toBeVisible();
  });

  test("shows error for invalid email", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[name="email"]').fill("nonexistent@example.com");
    await page.getByTestId(testIds.auth.loginSubmit).click();

    await expect(page.getByTestId(testIds.auth.loginNoAccount)).toBeVisible();
  });

  test("login with email and password", async ({ page }) => {
    await page.goto("/login");

    // Enter email and submit to trigger account check
    await page.locator('input[name="email"]').fill(env.E2E_PARTNER_EMAIL);
    await page.getByTestId(testIds.auth.loginSubmit).click();

    // Wait for password field to appear
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Enter password and submit
    await page.locator('input[type="password"]').fill(env.E2E_PARTNER_PASSWORD);
    await page.getByTestId(testIds.auth.loginSubmit).click();

    // Verify redirect to authenticated area
    await page.waitForURL((url) =>
      /^\/(programs|onboarding)/.test(new URL(url).pathname),
    );
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("shows error for wrong password", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[name="email"]').fill(env.E2E_PARTNER_EMAIL);
    await page.getByTestId(testIds.auth.loginSubmit).click();

    await expect(page.locator('input[type="password"]')).toBeVisible();

    await page.locator('input[type="password"]').fill("wrongpassword123");
    await page.getByTestId(testIds.auth.loginSubmit).click();

    await expect(
      page.getByTestId(testIds.auth.loginInvalidCredentials),
    ).toBeVisible();
  });
});
