import { expect, test } from "@playwright/test";

const partnerAuth = "playwright/.auth/partner.json";

test.describe("Partner onboarding", () => {
  // Must run before the unauthenticated describe below: an earlier test.use({ storageState: empty })
  // in this file was leaving these tests without session cookies (middleware → /login).
  test.use({ storageState: partnerAuth });

  test("onboarding page renders", async ({ page }) => {
    await page.goto("/onboarding");

    await expect(
      page.getByRole("heading", { name: "Create your partner profile" }),
    ).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.getByText("Profile image")).toBeVisible();
    await expect(page.getByLabel("Country")).toBeVisible();
    await expect(
      page.getByLabel(/Description/, { exact: false }),
    ).toBeVisible();
    await expect(page.getByText("Profile Type")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("profile submit redirects to platforms", async ({ page }) => {
    await page.goto("/onboarding");

    const nameInput = page.locator('input[name="name"]');
    const countryField = page.getByLabel("Country");
    const searchCountriesInput = page.getByPlaceholder("Search countries...");
    const continueButton = page.getByRole("button", { name: "Continue" });
    const acknowledgeButton = page.getByRole("button", {
      name: "I acknowledge",
    });

    await nameInput.fill("E2E Onboarding Test");
    await countryField.click();

    if (
      await acknowledgeButton.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      await acknowledgeButton.click();
    }

    await expect(searchCountriesInput).toBeVisible({
      timeout: 5000,
    });
    await searchCountriesInput.fill("United States");
    await page.getByText("United States", { exact: true }).first().click();

    await continueButton.click();

    await page.waitForURL(/\/onboarding\/platforms/);
    await expect(
      page.getByRole("heading", {
        name: "Your social and web platforms",
      }),
    ).toBeVisible();
  });

  test("platforms step skip link goes to payouts or programs", async ({
    page,
  }) => {
    await page.goto("/onboarding");

    const nameInput = page.locator('input[name="name"]');
    const countryField = page.getByLabel("Country");
    const searchCountriesInput = page.getByPlaceholder("Search countries...");
    const continueButton = page.getByRole("button", { name: "Continue" });
    const skipLink = page.getByRole("link", {
      name: "I'll complete this later",
    });
    const acknowledgeButton = page.getByRole("button", {
      name: "I acknowledge",
    });

    await nameInput.fill("E2E Onboarding Test");
    await countryField.click();

    if (
      await acknowledgeButton.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      await acknowledgeButton.click();
    }

    await expect(searchCountriesInput).toBeVisible({
      timeout: 5000,
    });
    await searchCountriesInput.fill("United States");
    await page.getByText("United States", { exact: true }).first().click();
    await continueButton.click();
    await page.waitForURL(/\/onboarding\/platforms/);

    await skipLink.click();

    await expect(page).toHaveURL(/\/(onboarding\/payouts|programs)/);
    if (page.url().includes("/onboarding/payouts")) {
      await expect(
        page.getByRole("heading", { name: "Connect payouts" }),
      ).toBeVisible();
    }
  });

  test("payouts step skip link goes to programs", async ({ page }) => {
    await page.goto("/onboarding/payouts");

    await page.waitForURL(/\/(onboarding\/payouts|programs)/);

    if (page.url().includes("/programs")) {
      return;
    }

    const skipLink = page.getByRole("link", {
      name: "I'll complete this later",
    });
    await skipLink.click();
    await expect(page).toHaveURL(/\/programs/);
  });
});

test.describe("Partner onboarding (unauthenticated)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated redirect to login", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/login/);
  });
});
