import { nanoid, PARTNER_CHECKOUT_TRIAL_PERIOD_DAYS } from "@dub/utils";
import { expect, test } from "@playwright/test";
import { installBillingCheckoutMocks } from "./billing-mocks";

const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function randomOnboardingDomain() {
  const id = nanoid(10).replace(/_/g, "-").toLowerCase();
  return `e2e-${id}.invalid`;
}

function matchesDashboardOrigin(url: URL, baseURL: string) {
  const base = new URL(baseURL);
  return url.hostname === base.hostname && url.port === base.port;
}

test("complete workspace onboarding with Dub Partners product", async ({
  page,
  baseURL,
}) => {
  const workspaceName = `Test WS ${nanoid(6)}`;
  const customDomain = randomOnboardingDomain();
  const dashboardOrigin =
    baseURL ??
    process.env.PLAYWRIGHT_DASHBOARD_BASE_URL ??
    "http://localhost:8888";

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

  // Select "Dub Partners" product
  await page
    .getByRole("button", { name: "Continue with Dub Partners" })
    .click();

  // Domain step — connect a custom domain
  await page.waitForURL(/\/onboarding\/domain/);
  await expect(
    page.getByRole("heading", { name: "Add a custom domain" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Connect domain" }).click();

  await page.waitForURL(/\/onboarding\/domain\/custom/);
  await expect(
    page.getByRole("heading", { name: "Connect a custom domain" }),
  ).toBeVisible();

  await page.getByPlaceholder("go.acme.com").fill(customDomain);
  await expect(page.getByText(/is ready to connect/i)).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Add domain" }).click();

  // Partner program step
  await page.waitForURL(/\/onboarding\/program/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: "Create your partner program" }),
  ).toBeVisible();

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
  await page.getByRole("button", { name: "Continue" }).click();

  // Default reward — keep Sale / recurring / percentage defaults, set 30%
  await page.waitForURL(/\/onboarding\/program\/reward/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: "Create your default reward" }),
  ).toBeVisible();
  await page.getByLabel(/Percentage per sale/i).fill("30");
  await page.getByRole("button", { name: "Continue" }).click();

  // Plan step — mocked checkout trial (no Stripe)
  await page.waitForURL(/\/onboarding\/plan/, { timeout: 30_000 });
  await expect(
    page
      .locator("h1")
      .filter({ hasText: /Partners/i })
      .filter({ hasText: /plan/i }),
  ).toBeVisible();

  await installBillingCheckoutMocks(page, {
    slug,
    baseURL: dashboardOrigin,
  });

  const trialCta = page.getByRole("button", {
    name: new RegExp(
      `Start ${PARTNER_CHECKOUT_TRIAL_PERIOD_DAYS}-day trial · Advanced Monthly`,
    ),
  });
  await expect(trialCta).toBeVisible({ timeout: 30_000 });
  await trialCta.click();

  await page.waitForURL(
    (u) => {
      const url = new URL(u);
      return (
        matchesDashboardOrigin(url, dashboardOrigin) &&
        url.searchParams.get("upgraded") === "true"
      );
    },
    { timeout: 30_000, waitUntil: "domcontentloaded" },
  );

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

  await expect(
    page.getByRole("heading", {
      name: /Dub Pro looks good on you/i,
    }),
  ).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "View dashboard" }).click();

  await expect(page.getByText("Free trial", { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  expect(page.url()).toContain(`/${slug}`);
});
