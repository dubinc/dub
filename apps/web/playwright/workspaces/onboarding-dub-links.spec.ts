import { nanoid } from "@dub/utils";
import { expect, test } from "@playwright/test";

/** Client navigations can finish before a sequential waitForURL runs; pair clicks with URL assertions. */
const STEP_NAV_TIMEOUT = 60_000;

test("complete workspace onboarding with Dub Links product", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const workspaceName = `Test WS ${nanoid(6)}`;

  // Welcome page
  await page.goto("/onboarding");
  await expect(
    page.getByRole("heading", { name: "Welcome to Dub" }),
  ).toBeVisible();
  await Promise.all([
    expect(page).toHaveURL(/\/onboarding\/workspace/, {
      timeout: STEP_NAV_TIMEOUT,
    }),
    page.getByRole("button", { name: "Get started" }).click(),
  ]);

  // Workspace creation step
  await expect(
    page.getByRole("heading", { name: "Create your workspace" }),
  ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });

  // Fill workspace name (slug auto-generates)
  await page.locator('input[id="name"]').fill(workspaceName);

  // Read the auto-generated slug for later assertions
  const slug = await page.locator('input[id="slug"]').inputValue();
  expect(slug).toBeTruthy();

  const productsHeading = page.getByRole("heading", {
    name: "What do you want to do with Dub?",
  });

  await Promise.all([
    expect(page).toHaveURL(/\/onboarding\/products/, {
      timeout: STEP_NAV_TIMEOUT,
    }),
    page.getByRole("button", { name: "Create workspace" }).click(),
  ]);
  await expect(productsHeading).toBeVisible({ timeout: STEP_NAV_TIMEOUT });

  await Promise.all([
    expect(page).toHaveURL(/\/onboarding\/domain/, {
      timeout: STEP_NAV_TIMEOUT,
    }),
    page.getByRole("button", { name: "Continue with Dub Links" }).click(),
  ]);

  // Domain step — skip it
  await expect(
    page.getByRole("heading", { name: "Add a custom domain" }),
  ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
  const skipDomainCta = page.getByRole("button", {
    name: "I'll do this later",
  });
  await expect(skipDomainCta).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
  await Promise.all([
    expect(page).toHaveURL(/\/onboarding\/plan/, {
      timeout: STEP_NAV_TIMEOUT,
    }),
    skipDomainCta.click(),
  ]);

  // Plan step — use free plan
  const freePlanCta = page.getByRole("button", {
    name: "Start for free, pick a plan later",
  });
  await expect(freePlanCta).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
  await Promise.all([
    expect(page).toHaveURL(/\/onboarding\/success/, {
      timeout: STEP_NAV_TIMEOUT,
    }),
    freePlanCta.click(),
  ]);

  // Success page
  await expect(
    page.locator("h1").filter({ hasText: workspaceName }),
  ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
  await expect(
    page.locator("h3").filter({ hasText: /^Complete setup$/ }),
  ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });

  // Go to dashboard
  const dashboardCta = page.getByRole("button", {
    name: "Go to your dashboard",
  });
  await expect(dashboardCta).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
  const slugPathPattern = new RegExp(
    `/${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/|$)`,
  );
  await Promise.all([
    expect(page).toHaveURL(slugPathPattern, {
      timeout: STEP_NAV_TIMEOUT,
    }),
    dashboardCta.click(),
  ]);

  expect(page.url()).toContain(`/${slug}`);
});
