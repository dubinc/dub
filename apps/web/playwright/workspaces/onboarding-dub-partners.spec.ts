import { nanoid } from "@dub/utils";
import { expect, test } from "@playwright/test";
import {
  finishOnboardingCheckoutWithoutStripeRedirect,
  installBillingCheckoutMocks,
} from "./billing-mocks";

const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function randomOnboardingDomain() {
  const id = nanoid(10).replace(/_/g, "-").toLowerCase();
  return `e2e-${id}.invalid`;
}

/** Client navigations can finish before a sequential waitForURL runs; pair clicks with URL assertions. */
const STEP_NAV_TIMEOUT = 60_000;

test("complete workspace onboarding with Dub Partners product", async ({
  page,
  baseURL: baseURLParam,
}) => {
  test.setTimeout(180_000);

  const workspaceName = `Test WS ${nanoid(6)}`;
  const customDomain = randomOnboardingDomain();
  const baseURL = baseURLParam ?? "http://app.localhost:8888";

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
  ).toBeVisible();

  // Fill workspace name (slug auto-generates)
  await page.locator('input[id="name"]').fill(workspaceName);

  // Read the auto-generated slug for later assertions
  const slug = await page.locator('input[id="slug"]').inputValue();
  expect(slug).toBeTruthy();

  const productsHeading = page.getByRole("heading", {
    name: "What do you want to do with Dub?",
  });

  // Navigation runs in onSuccess after POST + SWR mutate + session.update(); wait for API first (CI).
  const createWorkspacePost = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname === "/api/workspaces",
    { timeout: STEP_NAV_TIMEOUT },
  );
  await page.getByRole("button", { name: "Create workspace" }).click();
  const createWsRes = await createWorkspacePost;
  if (!createWsRes.ok()) {
    throw new Error(
      `Create workspace failed: HTTP ${createWsRes.status()} ${await createWsRes.text()}`,
    );
  }
  await expect(page).toHaveURL(/\/onboarding\/products/, {
    timeout: STEP_NAV_TIMEOUT,
  });
  await expect(productsHeading).toBeVisible({ timeout: STEP_NAV_TIMEOUT });

  // Select "Dub Partners" product
  await Promise.all([
    expect(page).toHaveURL(/\/onboarding\/domain/, {
      timeout: STEP_NAV_TIMEOUT,
    }),
    page.getByRole("button", { name: "Continue with Dub Partners" }).click(),
  ]);

  // Domain step — connect a custom domain
  await expect(
    page.getByRole("heading", { name: "Add a custom domain" }),
  ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
  await Promise.all([
    expect(page).toHaveURL(/\/onboarding\/domain\/custom/, {
      timeout: STEP_NAV_TIMEOUT,
    }),
    page.getByRole("button", { name: "Connect domain" }).click(),
  ]);

  await expect(
    page.getByRole("heading", { name: "Connect a custom domain" }),
  ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });

  await page.getByPlaceholder("go.acme.com").fill(customDomain);
  await expect(page.getByText(/is ready to connect/i)).toBeVisible({
    timeout: 30_000,
  });
  await Promise.all([
    expect(page).toHaveURL(/\/onboarding\/program/, {
      timeout: STEP_NAV_TIMEOUT,
    }),
    page.getByRole("button", { name: "Add domain" }).click(),
  ]);

  // Partner program step
  await expect(
    page.getByRole("heading", { name: "Create your partner program" }),
  ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });

  await page.getByLabel("Company name").fill(`Test Program ${nanoid(4)}`);
  await page.locator('input[type="file"]').setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: MINIMAL_PNG,
  });
  await expect
    .poll(async () => page.locator('img[alt="Preview"]').count(), {
      timeout: 30_000,
    })
    .toBeGreaterThan(0);

  await page.getByLabel("Destination URL").fill("https://acme.com");
  await page.getByLabel("Support email").fill("support@acme.com");
  await Promise.all([
    expect(page).toHaveURL(/\/onboarding\/program\/reward/, {
      timeout: STEP_NAV_TIMEOUT,
    }),
    page.getByRole("button", { name: "Continue" }).click(),
  ]);

  // Default reward — keep Sale / recurring / percentage defaults, set 30%
  await expect(
    page.getByRole("heading", { name: "Create your default reward" }),
  ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
  const pctInput = page.getByLabel(/Percentage per sale/i);
  await expect(pctInput).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
  await page.waitForTimeout(2000);
  await pctInput.fill("30", { force: true });
  await Promise.all([
    expect(page).toHaveURL(/\/onboarding\/plan/, {
      timeout: STEP_NAV_TIMEOUT,
    }),
    page.getByRole("button", { name: "Continue" }).click(),
  ]);

  // Plan step — mocked checkout trial (no Stripe)
  await expect(
    page
      .locator("h1")
      .filter({ hasText: /Partners/i })
      .filter({ hasText: /plan/i }),
  ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });

  await installBillingCheckoutMocks(page, {
    slug,
    baseURL,
  });

  // Onboarding A/B: trial copy vs "Upgrade to …" — do not depend on localStorage in CI.
  const advancedPaidCta = page.getByRole("button", {
    name: /^(Start \d+-day trial ·|Upgrade to) Advanced Monthly$/,
  });
  await expect(advancedPaidCta).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
  await expect(advancedPaidCta).toBeEnabled({ timeout: STEP_NAV_TIMEOUT });

  const billingUpgradePost = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      r.url().includes(`/api/workspaces/${slug}/billing/upgrade`),
    { timeout: STEP_NAV_TIMEOUT },
  );

  await advancedPaidCta.click();

  const upgradeRes = await billingUpgradePost;
  expect(upgradeRes.ok()).toBeTruthy();
  await finishOnboardingCheckoutWithoutStripeRedirect(page, { slug, baseURL });

  await expect(
    page.getByRole("heading", {
      name: `The ${workspaceName} workspace has been created`,
    }),
  ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
  await expect(
    page.getByRole("button", { name: "Go to your dashboard" }),
  ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
  await expect(
    page.getByRole("heading", { name: "Complete setup" }),
  ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });

  await expect
    .poll(
      async () => {
        const res = await page.request.get(`/api/workspaces/${slug}`);
        if (!res.ok()) return null;
        const body = (await res.json()) as { trialEndsAt?: string | null };
        return body.trialEndsAt ?? null;
      },
      {
        timeout: 90_000,
        intervals: [500, 1000, 2000],
      },
    )
    .not.toBeNull();
});
