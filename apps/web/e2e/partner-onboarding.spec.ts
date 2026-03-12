import { expect, test } from "@playwright/test";

const partnerEmail = process.env.E2E_PARTNER_EMAIL;
const partnerPassword = process.env.E2E_PARTNER_PASSWORD;

async function loginAsPartner(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(partnerEmail!);
  await page.getByRole("button", { name: "Log in with email" }).click();
  await expect(page.locator('input[type="password"]')).toBeVisible({
    timeout: 10000,
  });
  await page.locator('input[type="password"]').fill(partnerPassword!);
  await page.getByRole("button", { name: "Log in with password" }).click();
  await page.waitForURL(/\/(programs|onboarding)/, { timeout: 15000 });
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

      await expect(
        page.getByRole("heading", { name: "Create your partner profile" }),
      ).toBeVisible();
      await expect(page.locator('input[name="name"]')).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Select country|United States/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Continue" }),
      ).toBeVisible();
    });

    test("profile submit redirects to platforms", async ({ page }) => {
      await loginAsPartner(page);
      await page.goto("/onboarding");

      await page.locator('input[name="name"]').fill("E2E Onboarding Test");
      await page
        .getByRole("button", { name: /Select country|United States/ })
        .click();

      const acknowledgeButton = page.getByRole("button", {
        name: "I acknowledge",
      });
      if (
        await acknowledgeButton.isVisible({ timeout: 2000 }).catch(() => false)
      ) {
        await acknowledgeButton.click();
      }

      await expect(
        page.getByPlaceholder("Search countries..."),
      ).toBeVisible({ timeout: 5000 });
      await page.getByPlaceholder("Search countries...").fill("United States");
      await page.getByText("United States", { exact: true }).first().click();

      await page.getByRole("button", { name: "Continue" }).click();

      await page.waitForURL(/\/onboarding\/platforms/, { timeout: 15000 });
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

      await page.locator('input[name="name"]').fill("E2E Onboarding Test");
      await page
        .getByRole("button", { name: /Select country|United States/ })
        .click();

      const acknowledgeButton = page.getByRole("button", {
        name: "I acknowledge",
      });
      if (
        await acknowledgeButton.isVisible({ timeout: 2000 }).catch(() => false)
      ) {
        await acknowledgeButton.click();
      }

      await expect(
        page.getByPlaceholder("Search countries..."),
      ).toBeVisible({ timeout: 5000 });
      await page.getByPlaceholder("Search countries...").fill("United States");
      await page.getByText("United States", { exact: true }).first().click();
      await page.getByRole("button", { name: "Continue" }).click();
      await page.waitForURL(/\/onboarding\/platforms/, { timeout: 15000 });

      await page
        .getByRole("link", { name: "I'll complete this later" })
        .click();

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
        timeout: 10000,
      });

      if (page.url().includes("/programs")) {
        return;
      }

      await page
        .getByRole("link", { name: "I'll complete this later" })
        .click();
      await expect(page).toHaveURL(/\/programs/);
    });
  });
});
