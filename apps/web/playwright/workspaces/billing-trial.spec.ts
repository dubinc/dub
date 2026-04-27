import { DUB_TRIAL_PERIOD_DAYS } from "@dub/utils";
import { expect, test } from "@playwright/test";
import {
  applyMockTrialToWorkspace,
  captureWorkspaceBillingTrialSnapshot,
  finishBillingUpgradeCheckoutWithoutStripeRedirect,
  installBillingCheckoutMocks,
  patchStripeRedirectStubForE2E,
  restoreWorkspaceBillingTrialSnapshot,
  type BillingMockTrialWorkspaceSnapshot,
} from "./billing-mocks";

const STEP_NAV_TIMEOUT = 60_000;

test.describe("Billing trial checkout", () => {
  test("select Pro, success redirect, trial state and UI", async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(120_000);

    const dashboardOrigin = baseURL ?? "http://app.localhost:8888";

    const res = await page.request.get("/api/workspaces");
    expect(res.ok()).toBeTruthy();
    const workspaces = (await res.json()) as { plan: string; slug: string }[];
    const freeWorkspace = workspaces.find((w) => w.plan === "free");
    if (!freeWorkspace) {
      throw new Error("No free workspace found");
    }
    const slug = freeWorkspace.slug;

    await installBillingCheckoutMocks(page, {
      slug,
      baseURL: dashboardOrigin,
    });
    await patchStripeRedirectStubForE2E(page);

    await page.goto(`/${slug}/settings/billing/upgrade`);
    await expect(
      page.getByRole("heading", { name: "Plans", exact: true }),
    ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });

    const proColumn = page.getByTestId("billing-upgrade-column-pro");
    const upgradeButton = proColumn.getByRole("button", { name: "Upgrade" }).or(
      proColumn.getByRole("button", {
        name: new RegExp(`Start ${DUB_TRIAL_PERIOD_DAYS}-day trial`),
      }),
    );

    await expect(upgradeButton).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
    await expect(upgradeButton).toBeEnabled({ timeout: STEP_NAV_TIMEOUT });

    const billingUpgradePost = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        r.url().includes(`/api/workspaces/${slug}/billing/upgrade`),
      { timeout: STEP_NAV_TIMEOUT },
    );

    await upgradeButton.click();

    const upgradeRes = await billingUpgradePost;
    if (!upgradeRes.ok()) {
      throw new Error(
        `billing/upgrade failed: HTTP ${upgradeRes.status()} ${await upgradeRes.text()}`,
      );
    }

    await finishBillingUpgradeCheckoutWithoutStripeRedirect(page, {
      slug,
      baseURL: dashboardOrigin,
      plan: "pro",
      period: "monthly",
    });

    await expect
      .poll(
        async () => {
          const r = await page.request.get(`/api/workspaces/${slug}`);
          if (!r.ok()) return null;
          const body = (await r.json()) as { trialEndsAt?: string | null };
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
    ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });

    await page.getByRole("button", { name: "View dashboard" }).click();

    await expect(page.getByText("Free trial", { exact: true })).toBeVisible({
      timeout: STEP_NAV_TIMEOUT,
    });
  });
});

test.describe("Free trial user navigation", () => {
  let slug: string;
  let workspaceId: string;
  let preMockTrialWorkspace: BillingMockTrialWorkspaceSnapshot | undefined;

  test.beforeAll(async ({ request }) => {
    const res = await request.get("/api/workspaces");
    expect(res.ok()).toBeTruthy();
    const [workspace] = (await res.json()) as { id: string; slug: string }[];
    slug = workspace.slug;
    workspaceId = workspace.id;

    preMockTrialWorkspace = await captureWorkspaceBillingTrialSnapshot(slug);
    await applyMockTrialToWorkspace(slug);
  });

  test.afterAll(async () => {
    if (slug && preMockTrialWorkspace) {
      await restoreWorkspaceBillingTrialSnapshot(slug, preMockTrialWorkspace);
    }
  });

  test("billing settings page shows trial banner and CTAs", async ({
    page,
  }) => {
    await page.goto(`/${slug}/settings/billing`);

    await expect(page.getByText(/Trial ends on/)).toBeVisible({
      timeout: STEP_NAV_TIMEOUT,
    });
    await expect(
      page.getByRole("button", { name: "Start paid plan" }),
    ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
    await expect(page.getByRole("link", { name: "View plans" })).toBeVisible({
      timeout: STEP_NAV_TIMEOUT,
    });
  });

  test("upgrade page shows Activate plan for current Pro plan", async ({
    page,
  }) => {
    await page.goto(`/${slug}/settings/billing/upgrade`);

    await expect(
      page.getByRole("heading", { name: "Plans", exact: true }),
    ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
    await expect(
      page.getByRole("button", { name: "Activate plan" }),
    ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
  });

  test("activating plan from billing page shows upgraded modal", async ({
    page,
  }) => {
    await page.route(
      (url) =>
        String(url).includes(
          `/api/workspaces/${workspaceId}/billing/activate-paid-plan`,
        ),
      async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      },
    );

    await page.goto(`/${slug}/settings/billing`);

    await page.getByRole("button", { name: "Start paid plan" }).click();
    await expect(
      page.getByRole("heading", { name: "Plan start confirmation" }),
    ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
    await expect(
      page.getByText("You'll be charged today and your trial will end."),
    ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });

    await page.getByRole("button", { name: "Start paid plan" }).last().click();

    await expect(
      page.getByRole("heading", { name: /Dub Business looks good on you/i }),
    ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
  });
});
