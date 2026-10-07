import { testIds } from "@/lib/e2e/test-ids";
import { expect, test } from "@playwright/test";

test.describe("Partner onboarding (unauthenticated)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated redirect to login", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Partner onboarding", () => {
  test("onboarding page renders", async ({ page }) => {
    await page.goto("/onboarding");

    await expect(
      page.getByTestId(testIds.partnerOnboarding.profile),
    ).toBeVisible();
    await expect(page.locator('input[name="name"]').first()).toBeVisible();
    await expect(
      page.getByTestId(testIds.partnerOnboarding.profileImage),
    ).toBeVisible();
    await expect(
      page.getByTestId(testIds.partnerOnboarding.aboutYou),
    ).toBeVisible();
    await expect(
      page.getByTestId(testIds.partnerOnboarding.profileType),
    ).toBeVisible();
    await expect(
      page.getByTestId(testIds.partnerOnboarding.continue),
    ).toBeVisible();
  });

  test("profile submit redirects to platforms", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    const nameInput = page.locator('input[name="name"]');
    const continueButton = page.getByTestId(testIds.partnerOnboarding.continue);

    await nameInput.fill("E2E Onboarding Test");
    await continueButton.click();

    await page.waitForURL("/onboarding/platforms");
    await expect(
      page.getByTestId(testIds.partnerOnboarding.platforms),
    ).toBeVisible();
  });

  test("platforms step skip link goes to payouts", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    const nameInput = page.locator('input[name="name"]').first();
    const continueButton = page.getByTestId(testIds.partnerOnboarding.continue);

    await nameInput.fill("E2E Onboarding Test");
    await continueButton.click();
    await page.waitForURL("/onboarding/platforms");

    const skipLink = page.getByTestId(testIds.partnerOnboarding.skip);
    await expect(skipLink).toBeVisible();
    await skipLink.click();

    await expect(page).toHaveURL("/onboarding/payouts");
  });

  test("payouts step skip link goes to programs", async ({ page }) => {
    await page.goto("/onboarding/payouts");

    const skipLink = page.getByTestId(testIds.partnerOnboarding.skip);
    await expect(skipLink).toBeVisible();
    await skipLink.click();

    await expect(page).toHaveURL("/programs");
  });
});
