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

    await expect(page.getByText("Create your partner profile")).toBeVisible();
    await expect(page.locator('input[name="name"]').first()).toBeVisible();
    await expect(page.getByText("Profile image").first()).toBeVisible();
    await expect(page.getByText("About you").first()).toBeVisible();
    await expect(page.getByText("Profile Type").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("profile submit redirects to platforms", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    const nameInput = page.locator('input[name="name"]');
    const continueButton = page.getByRole("button", { name: "Continue" });

    await nameInput.fill("E2E Onboarding Test");
    await continueButton.click();

    await page.waitForURL("/onboarding/platforms");
    await expect(
      page.getByText("Your social and web platforms", { exact: true }),
    ).toBeVisible();
  });

  test("platforms step skip link goes to payouts", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    const nameInput = page.locator('input[name="name"]').first();
    const continueButton = page.getByRole("button", { name: "Continue" });

    await nameInput.fill("E2E Onboarding Test");
    await continueButton.click();
    await page.waitForURL("/onboarding/platforms");

    const skipLink = page.getByRole("link", {
      name: "I'll complete this later",
    });
    await expect(skipLink).toBeVisible();
    await skipLink.click();

    await expect(page).toHaveURL("/onboarding/payouts");
  });

  test("payouts step skip link goes to programs", async ({ page }) => {
    await page.goto("/onboarding/payouts");

    const skipLink = page.getByRole("link", {
      name: "I'll complete this later",
    });
    await expect(skipLink).toBeVisible();
    await skipLink.click();

    await expect(page).toHaveURL("/programs");
  });
});
