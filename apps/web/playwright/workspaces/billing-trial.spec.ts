import { DUB_TRIAL_PERIOD_DAYS } from "@dub/utils";
import { expect, test } from "@playwright/test";
import {
  applyMockActivatedPaidPlan,
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

test.describe("Billing trial checkout", () => {
  test("select Pro, success redirect, trial state and UI", async ({
    page,
    baseURL,
    request,
  }) => {
    const dashboardOrigin = baseURL ?? "http://app.localhost:8888";

    const res = await request.get("/api/workspaces");
    expect(res.ok()).toBeTruthy();
    const workspaces = (await res.json()) as { plan: string; slug: string }[];
    const workspace =
      workspaces.find((w) => w.plan === "free") ?? workspaces[0];
    if (!workspace) {
      throw new Error("No workspace found");
    }
    const { slug } = workspace;
    expect(workspace.plan).toBe("free");

    const snapshot = await captureWorkspaceBillingTrialSnapshot(slug);
    await installBillingCheckoutMocks(page, { slug, baseURL: dashboardOrigin });

    try {
      await page.goto(`/${slug}/settings/billing/upgrade`);
      await expect(
        page.getByRole("heading", { name: "Plans", exact: true }),
      ).toBeVisible({ timeout: 30_000 });

      const proCard = page.getByRole("heading", { name: "Pro", exact: true });
      await proCard
        .locator("xpath=ancestor::div[contains(@class,'flex-col')][1]")
        .getByRole("button", {
          name: new RegExp(`Start ${DUB_TRIAL_PERIOD_DAYS}-day trial`, "i"),
        })
        .click();

      await page.waitForURL(
        (u) => {
          const url = new URL(u);
          return (
            matchesDashboardOrigin(url, dashboardOrigin) &&
            url.searchParams.get("upgraded") === "true" &&
            url.searchParams.get("plan") === "pro"
          );
        },
        { timeout: 30_000, waitUntil: "domcontentloaded" },
      );

      await expect
        .poll(
          async () => {
            const wsRes = await request.get(`/api/workspaces/${slug}`);
            if (!wsRes.ok()) return null;
            const body = (await wsRes.json()) as {
              plan?: string;
              trialEndsAt?: string | null;
            };
            if (body.plan !== "pro" || !body.trialEndsAt) return null;
            return body.trialEndsAt;
          },
          { timeout: 90_000, intervals: [500, 1000, 2000] },
        )
        .not.toBeNull();

      await expect(
        page.getByRole("heading", { name: /Dub Pro looks good on you/i }),
      ).toBeVisible({ timeout: 15_000 });

      await page.getByRole("button", { name: "View dashboard" }).click();
      await expect(page.getByText("Free trial", { exact: true })).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await restoreWorkspaceBillingTrialSnapshot(slug, snapshot);
    }
  });
});

test.describe("Free trial user navigation", () => {
  let slug: string;
  let workspaceId: string;
  let preMockTrialWorkspace: BillingMockTrialWorkspaceSnapshot | undefined;

  test.beforeAll(async ({ request }) => {
    const res = await request.get("/api/workspaces");
    expect(res.ok()).toBeTruthy();
    const workspaces = (await res.json()) as {
      id: string;
      slug: string;
      plan: string;
    }[];
    // Same workspace as checkout test (API returns createdAt asc — links onboarding is first).
    const workspace =
      workspaces.find((w) => w.plan === "free") ?? workspaces[0];
    if (!workspace) throw new Error("No workspace found");
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

  test("billing settings page shows trial banner and CTAs", async ({ page }) => {
    await page.goto(`/${slug}/settings/billing`);

    await expect(page.getByText(/Trial ends on/)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("button", { name: "Start paid plan" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "View plans" })).toBeVisible();
  });

  test("upgrade page shows Activate plan for current Business plan", async ({
    page,
  }) => {
    await page.goto(`/${slug}/settings/billing/upgrade`);

    await expect(
      page.getByRole("heading", { name: "Plans", exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    const businessCard = page.getByRole("heading", {
      name: "Business",
      exact: true,
    });
    await expect(
      businessCard
        .locator("xpath=ancestor::div[contains(@class,'flex-col')][1]")
        .getByRole("button", { name: "Activate plan" }),
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
        await applyMockActivatedPaidPlan(slug);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      },
    );

    await page.goto(`/${slug}/settings/billing`);

    await page.getByRole("button", { name: "Start paid plan" }).click();
    const confirmModal = page.getByRole("dialog").filter({
      has: page.getByRole("heading", { name: "Plan start confirmation" }),
    });
    await expect(confirmModal).toBeVisible();
    await expect(
      confirmModal.getByText(
        "You'll be charged today and your trial will end.",
      ),
    ).toBeVisible();
    await confirmModal
      .getByRole("button", { name: "Start paid plan" })
      .click();

    await page.waitForURL((u) => {
      const url = new URL(u);
      return (
        url.searchParams.get("upgraded") === "true" &&
        url.searchParams.get("plan") === "business"
      );
    });
    await expect(
      page.getByRole("heading", { name: /Dub Business looks good on you/i }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
