import { expect, test } from "@playwright/test";
import { resetE2eWorkspaceForBillingTest } from "./apply-mock-trial";
import { installBillingCheckoutMocks } from "./billing-trial-mocks";
import { E2E_DASHBOARD } from "./e2e-dashboard-constants";

const slug = E2E_DASHBOARD.workspaceSlug;

function matchesDashboardOrigin(url: URL, baseURL: string) {
  const base = new URL(baseURL);
  return url.hostname === base.hostname && url.port === base.port;
}

test.describe("Billing trial checkout", () => {
  test("select Pro, success redirect, trial state and UI", async ({
    page,
    baseURL,
  }) => {
    const dashboardOrigin =
      baseURL ??
      process.env.PLAYWRIGHT_DASHBOARD_BASE_URL ??
      "http://localhost:8888";

    await resetE2eWorkspaceForBillingTest(slug);
    await installBillingCheckoutMocks(page, {
      slug,
      baseURL: dashboardOrigin,
    });

    await page.goto(`/${slug}/settings/billing/upgrade`);
    await expect(
      page.getByRole("heading", { name: "Plans", exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    const upgradeButtons = page.getByRole("button", { name: "Upgrade" });
    await expect(upgradeButtons.first()).toBeVisible();
    await upgradeButtons.first().click();

    await page.waitForURL(
      (u) => {
        const url = new URL(u);
        return (
          matchesDashboardOrigin(url, dashboardOrigin) &&
          url.searchParams.get("upgraded") === "true"
        );
      },
      { timeout: 30_000 },
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

    await page.getByRole("button", { name: "Go to Dub" }).click();

    await expect(page.getByText("Free trial", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  });
});
