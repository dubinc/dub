import { expect, test } from "@playwright/test";
import { env } from "./env";

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
    ).toBeVisible({ timeout: 30000 });
  });

  test.describe("with credentials", () => {
    test.skip(
      !env.E2E_PARTNER_EMAIL || !env.E2E_PARTNER_PASSWORD,
      "E2E_PARTNER_EMAIL and E2E_PARTNER_PASSWORD must be set",
    );

    test("login with email and password", async ({ page }) => {
      await page.goto("/login");

      // Enter email and submit to trigger account check
      await page.locator('input[name="email"]').fill(env.E2E_PARTNER_EMAIL);
      await page.getByRole("button", { name: "Log in with email" }).click();

      // Wait for password field to appear
      await expect(page.locator('input[type="password"]')).toBeVisible({
        timeout: 30000,
      });

      // Enter password and submit
      await page
        .locator('input[type="password"]')
        .fill(env.E2E_PARTNER_PASSWORD);
      await page.getByRole("button", { name: "Log in with password" }).click();

      // Verify redirect to authenticated area
      await page.waitForURL(
        (url) => /^\/(programs|onboarding)/.test(new URL(url).pathname),
        { timeout: 30000 },
      );
      await expect(page).not.toHaveURL(/\/login/);
    });

    test("shows error for wrong password", async ({ page }) => {
      await page.goto("/login");

      await page.locator('input[name="email"]').fill(env.E2E_PARTNER_EMAIL);
      await page.getByRole("button", { name: "Log in with email" }).click();

      await expect(page.locator('input[type="password"]')).toBeVisible({
        timeout: 30000,
      });

      await page.locator('input[type="password"]').fill("wrongpassword123");
      await page.getByRole("button", { name: "Log in with password" }).click();

      await expect(
        page.getByText("Email or password is incorrect."),
      ).toBeVisible({ timeout: 30000 });
    });
  });
});
