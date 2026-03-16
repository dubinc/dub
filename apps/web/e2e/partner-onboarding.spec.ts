import { expect, test } from "@playwright/test";

const partnerEmail = process.env.E2E_PARTNER_EMAIL;
const partnerPassword = process.env.E2E_PARTNER_PASSWORD;

async function loginAsPartner(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(partnerEmail!);
  await page.getByRole("button", { name: "Log in with email" }).click();
  await expect(page.locator('input[type="password"]')).toBeVisible({
    timeout: 30000,
  });
  await page.locator('input[type="password"]').fill(partnerPassword!);
  await page.getByRole("button", { name: "Log in with password" }).click();
  await page.waitForURL(/\/(programs|onboarding)/, { timeout: 30000 });
}

// Wait for Suspense fallback to resolve (the fallback renders a duplicate form)
async function waitForOnboardingForm(page: import("@playwright/test").Page) {
  await expect(page.locator('input[name="name"]')).toHaveCount(1, {
    timeout: 30000,
  });
}

test.describe("Partner onboarding", () => {
  test("unauthenticated redirect to login", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe("with credentials", () => {
    test.skip(
      !partnerEmail || !partnerPassword,
      "E2E_PARTNER_EMAIL and E2E_PARTNER_PASSWORD must be set",
    );

    test("onboarding page renders", async ({ page }) => {
      await loginAsPartner(page);
      await page.goto("/onboarding");
      await waitForOnboardingForm(page);

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
      await expect(
        page.getByRole("button", { name: "Continue" }),
      ).toBeVisible();
    });

    test("profile submit redirects to platforms", async ({ page }) => {
      await loginAsPartner(page);
      await page.goto("/onboarding");
      await waitForOnboardingForm(page);

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

      await page.waitForURL(/\/onboarding\/platforms/, { timeout: 30000 });
      await expect(
        page.getByRole("heading", {
          name: "Your social and web platforms",
        }),
      ).toBeVisible();
    });

    test("platforms step skip link goes to payouts or programs", async ({
      page,
    }) => {
      await loginAsPartner(page);
      await page.goto("/onboarding");
      await waitForOnboardingForm(page);

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
      await page.waitForURL(/\/onboarding\/platforms/, { timeout: 30000 });

      await skipLink.click();

      await expect(page).toHaveURL(/\/(onboarding\/payouts|programs)/);
      if (page.url().includes("/onboarding/payouts")) {
        await expect(
          page.getByRole("heading", { name: "Connect payouts" }),
        ).toBeVisible();
      }
    });

    test("payouts step skip link goes to programs", async ({ page }) => {
      await loginAsPartner(page);
      await page.goto("/onboarding/payouts");

      await page.waitForURL(/\/(onboarding\/payouts|programs)/, {
        timeout: 30000,
      });

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
});
