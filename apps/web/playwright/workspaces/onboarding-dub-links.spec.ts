import { testIds } from "@/lib/e2e/test-ids";
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
    page.getByTestId(testIds.onboarding.stepWelcome),
  ).toBeVisible();
  await Promise.all([
    expect(page).toHaveURL(/\/onboarding\/workspace/, {
      timeout: STEP_NAV_TIMEOUT,
    }),
    page.getByTestId(testIds.onboarding.getStarted).click(),
  ]);

  // Workspace creation step
  await expect(
    page.getByTestId(testIds.onboarding.stepWorkspace),
  ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });

  // Fill workspace name (slug auto-generates)
  await page.getByTestId(testIds.onboarding.workspaceName).fill(workspaceName);

  // Read the auto-generated slug for later assertions
  const slug = await page
    .getByTestId(testIds.onboarding.workspaceSlug)
    .inputValue();
  expect(slug).toBeTruthy();

  const productsHeading = page.getByTestId(testIds.onboarding.stepProducts);

  await Promise.all([
    expect(page).toHaveURL(/\/onboarding\/products/, {
      timeout: STEP_NAV_TIMEOUT,
    }),
    page.getByTestId(testIds.onboarding.createWorkspace).click(),
  ]);
  await expect(productsHeading).toBeVisible({ timeout: STEP_NAV_TIMEOUT });

  await Promise.all([
    expect(page).toHaveURL(/\/onboarding\/domain/, {
      timeout: STEP_NAV_TIMEOUT,
    }),
    page.getByTestId(testIds.onboarding.productCta("links")).click(),
  ]);

  // Domain step — skip it
  await expect(page.getByTestId(testIds.onboarding.stepDomain)).toBeVisible({
    timeout: STEP_NAV_TIMEOUT,
  });
  const skipDomainCta = page.getByTestId(testIds.onboarding.skipDomain);
  await expect(skipDomainCta).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
  await Promise.all([
    expect(page).toHaveURL(/\/onboarding\/plan/, {
      timeout: STEP_NAV_TIMEOUT,
    }),
    skipDomainCta.click(),
  ]);

  // Plan step — use free plan
  const freePlanCta = page.getByTestId(testIds.onboarding.freePlan);
  await expect(freePlanCta).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
  await Promise.all([
    expect(page).toHaveURL(/\/onboarding\/success/, {
      timeout: STEP_NAV_TIMEOUT,
    }),
    freePlanCta.click(),
  ]);

  // Success page
  await expect(
    page.getByTestId(testIds.onboarding.workspaceCreated),
  ).toContainText(workspaceName, { timeout: STEP_NAV_TIMEOUT });
  await expect(
    page.getByTestId(testIds.onboarding.completeSetup),
  ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });

  // Go to dashboard
  const dashboardCta = page.getByTestId(testIds.onboarding.goToDashboard);
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
