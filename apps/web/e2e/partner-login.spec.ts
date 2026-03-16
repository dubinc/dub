import { expect, test } from "@playwright/test";

const partnerEmail = process.env.E2E_PARTNER_EMAIL;
const partnerPassword = process.env.E2E_PARTNER_PASSWORD;

test.describe("Partner Login", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", {
        name: "Log in to your Dub Partner account",
      }),
    ).toBeVisible();

    await expect(page.locator('input[name="email"]')).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Log in with email" }),
    ).toBeVisible();
  });

  test("shows error for invalid email", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[name="email"]').fill("nonexistent@example.com");
    await page.getByRole("button", { name: "Log in with email" }).click();

    await expect(
      page.getByText("No account found with that email address."),
    ).toBeVisible({ timeout: 10000 });
  });

  test.describe("with credentials", () => {
    test.skip(
      !partnerEmail || !partnerPassword,
      "E2E_PARTNER_EMAIL and E2E_PARTNER_PASSWORD must be set",
    );

    test("login with email and password", async ({ page }) => {
      await page.goto("/login");

      // Enter email and submit to trigger account check
      await page.locator('input[name="email"]').fill(partnerEmail!);
      await page.getByRole("button", { name: "Log in with email" }).click();

      // Wait for password field to appear
      await expect(page.locator('input[type="password"]')).toBeVisible({
        timeout: 10000,
      });

      // Enter password and submit
      await page.locator('input[type="password"]').fill(partnerPassword!);
      await page.getByRole("button", { name: "Log in with password" }).click();

      // Verify redirect to authenticated area
      await page.waitForURL(/\/(programs|onboarding)/, { timeout: 30000 });
      await expect(page).not.toHaveURL(/\/login/);
    });

    test("shows error for wrong password", async ({ page }) => {
      await page.goto("/login");

      await page.locator('input[name="email"]').fill(partnerEmail!);
      await page.getByRole("button", { name: "Log in with email" }).click();

      await expect(page.locator('input[type="password"]')).toBeVisible({
        timeout: 10000,
      });

      await page.locator('input[type="password"]').fill("wrongpassword123");
      await page.getByRole("button", { name: "Log in with password" }).click();

      await expect(
        page.getByText("Email or password is incorrect."),
      ).toBeVisible({ timeout: 10000 });
    });
  });
});
