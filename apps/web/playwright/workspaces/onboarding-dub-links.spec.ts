import { nanoid } from "@dub/utils";
import { expect, test } from "@playwright/test";

test("complete workspace onboarding with Dub Links product", async ({
  page,
}) => {
  const workspaceName = `Test WS ${nanoid(6)}`;

  // Welcome page
  await page.goto("/onboarding");
  await expect(
    page.getByRole("heading", { name: "Welcome to Dub" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Get started" }).click();

  // Workspace creation step
  await page.waitForURL(/\/onboarding\/workspace/);
  await expect(
    page.getByRole("heading", { name: "Create your workspace" }),
  ).toBeVisible();

  // Fill workspace name (slug auto-generates)
  await page.locator('input[id="name"]').fill(workspaceName);

  // Read the auto-generated slug for later assertions
  const slug = await page.locator('input[id="slug"]').inputValue();
  expect(slug).toBeTruthy();

  // Submit workspace creation
  await page.getByRole("button", { name: "Create workspace" }).click();

  // Products step
  await page.waitForURL(/\/onboarding\/products/, { timeout: 15_000 });
  await expect(
    page.getByRole("heading", {
      name: "What do you want to do with Dub?",
    }),
  ).toBeVisible();

  // Select "Dub Links" product
  await page.getByRole("button", { name: "Continue with Dub Links" }).click();

  // Domain step — skip it
  await page.waitForURL(/\/onboarding\/domain/);
  await expect(
    page.getByRole("heading", { name: "Add a custom domain" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "I'll do this later" }).click();

  // Plan step — use free plan
  await page.waitForURL(/\/onboarding\/plan/);
  await page
    .getByRole("button", { name: "Start for free, pick a plan later" })
    .click();

  // Success page
  await page.waitForURL(/\/onboarding\/success/);
  await expect(
    page.getByText(`The ${workspaceName} workspace has been created`),
  ).toBeVisible();
  await expect(page.getByText("Complete setup")).toBeVisible();

  // Go to dashboard
  await page.getByRole("button", { name: "Go to your dashboard" }).click();

  // Verify redirect to workspace dashboard
  await page.waitForURL(new RegExp(`/${slug}`), {
    timeout: 15_000,
    waitUntil: "domcontentloaded",
  });
  expect(page.url()).toContain(`/${slug}`);
});
