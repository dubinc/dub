import { nanoid } from "@dub/utils";
import { expect, test } from "@playwright/test";
import { extractOtp, waitForEmail } from "../mailhog";

// Must satisfy: 8+ chars, uppercase, lowercase, digit
const SIGNUP_PASSWORD = "Password123";

const authFile = "playwright/.auth/partner.json";

test("sign up and verify new partner", async ({ page }) => {
  const email = `${nanoid(10)}@dub-internal-test.com`;

  // Go to registration page
  await page.goto("/register");

  // Step 1: Enter email and reveal password field
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Sign Up" }).click();

  // Step 2: Enter password and submit
  const passwordInput = page.locator('input[name="password"]');
  await expect(passwordInput).toBeVisible();
  await passwordInput.fill(SIGNUP_PASSWORD);
  await page.getByRole("button", { name: "Sign Up" }).click();

  // Step 3: Verify email via OTP from MailHog
  await expect(
    page.getByRole("heading", { name: "Verify your email address" }),
  ).toBeVisible();

  const message = await waitForEmail(email);
  const otp = extractOtp(message);

  // The OTP input auto-focuses on desktop — type the digits directly
  await page.keyboard.type(otp);

  // Step 4: Wait for redirect to onboarding after auto-submit
  // CI is slower; use domcontentloaded so we don't wait for full page load (images, etc.)
  await page.waitForURL(/\/onboarding/, {
    timeout: process.env.CI ? 30_000 : 15_000,
    waitUntil: "domcontentloaded",
  });

  // Save authenticated state
  await page.context().storageState({ path: authFile });
});
