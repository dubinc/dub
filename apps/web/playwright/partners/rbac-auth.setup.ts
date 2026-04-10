import { expect, test } from "@playwright/test";
import { PARTNER_USERS, PASSWORD } from "./constants";

const AUTH_FILES = {
  owner: "playwright/.auth/partner-owner.json",
  member: "playwright/.auth/partner-member.json",
  viewer: "playwright/.auth/partner-viewer.json",
} as const;

for (const [role, { email }] of Object.entries(PARTNER_USERS)) {
  test(`log in as ${role} partner user`, async ({ page }) => {
    const authFile = AUTH_FILES[role as keyof typeof AUTH_FILES];

    await page.goto("/login");

    // Enter email
    await page.locator('input[name="email"]').fill(email);
    await page.getByRole("button", { name: "Log in with email" }).click();

    // Enter password
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(PASSWORD);
    await page.getByRole("button", { name: "Log in with password" }).click();

    // Wait for redirect to authenticated area
    await page.waitForURL(
      (url) => /^\/(programs|onboarding)/.test(new URL(url).pathname),
      { timeout: 30_000 },
    );
    await expect(page).not.toHaveURL(/\/login/);

    // Save authenticated state
    await page.context().storageState({ path: authFile });
  });
}
