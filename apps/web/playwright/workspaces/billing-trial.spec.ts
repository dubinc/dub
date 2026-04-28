import { DUB_TRIAL_PERIOD_DAYS } from "@dub/utils";
import { expect, test } from "@playwright/test";
import {
  applyMockTrialToWorkspace,
  captureWorkspaceBillingTrialSnapshot,
  installBillingCheckoutMocks,
  restoreWorkspaceBillingTrialSnapshot,
  type BillingMockTrialWorkspaceSnapshot,
} from "./billing-mocks";

function matchesDashboardOrigin(url: URL, baseURL: string) {
  const base = new URL(baseURL);
  return url.hostname === base.hostname && url.port === base.port;
}

test.skip("Billing trial checkout", () => {
  test("select Pro, success redirect, trial state and UI", async ({
    page,
    baseURL,
  }) => {
    const dashboardOrigin = baseURL ?? "http://app.localhost:8888";

    // Discover the workspace created during onboarding
    const res = await page.request.get("/api/workspaces");
    expect(res.ok()).toBeTruthy();
    const workspaces = (await res.json()) as { plan: string; slug: string }[];
    // find the free workspace (from onboarding-dub-links.spec.ts)
    const freeWorkspace = workspaces.find((w) => w.plan === "free");
    if (!freeWorkspace) {
      throw new Error("No free workspace found");
    }
    const slug = freeWorkspace.slug;

    await installBillingCheckoutMocks(page, {
      slug,
      baseURL: dashboardOrigin,
    });

    await page.goto(`/${slug}/settings/billing/upgrade`);
    await expect(
      page.getByRole("heading", { name: "Plans", exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    // CTA: billing may show "Upgrade" or checkout trial copy from UpgradePlanButton.
    const upgradeButton = page.getByRole("button", { name: "Upgrade" }).or(
      page.getByRole("button", {
        name: new RegExp(`Start ${DUB_TRIAL_PERIOD_DAYS}-day trial`),
      }),
    );

    await expect(upgradeButton.first()).toBeVisible();
    await upgradeButton.first().click();

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
  });
});

test.skip("Free trial user navigation", () => {
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
      timeout: 15_000,
    });
    await expect(
      page.getByRole("button", { name: "Start paid plan" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "View plans" })).toBeVisible();
  });

  test("upgrade page shows Activate plan for current Pro plan", async ({
    page,
  }) => {
    await page.goto(`/${slug}/settings/billing/upgrade`);

    await expect(
      page.getByRole("heading", { name: "Plans", exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", { name: "Activate plan" }),
    ).toBeVisible();
  });

  test("activating plan from billing page shows upgraded modal", async ({
    page,
  }) => {
    await page.route(
      (url) =>
        url.pathname ===
        `/api/workspaces/${workspaceId}/billing/activate-paid-plan`,
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

    // Open the confirmation modal
    await page.getByRole("button", { name: "Start paid plan" }).click();
    await expect(
      page.getByRole("heading", { name: "Plan start confirmation" }),
    ).toBeVisible();
    await expect(
      page.getByText("You'll be charged today and your trial will end."),
    ).toBeVisible();

    // Confirm — triggers the mocked activate-paid-plan POST.
    // Two "Start paid plan" buttons exist: the page-level CTA and the modal confirm.
    await page.getByRole("button", { name: "Start paid plan" }).last().click();

    // Upgraded modal appears when ?upgraded=true lands in the URL
    await expect(
      page.getByRole("heading", { name: /Dub Pro looks good on you/i }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
