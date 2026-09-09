import { testIds } from "@/lib/e2e/test-ids";
import { nanoid } from "@dub/utils";
import { expect, test, type Page } from "@playwright/test";
import {
  finishOnboardingCheckoutWithoutStripeRedirect,
  installBillingCheckoutMocks,
} from "./billing-mocks";

const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** Host Playwright intercepts for the R2 PUT. CI has no STORAGE_*. */
const MOCK_SIGNED_URL = "https://storage.example.test/e2e-program-logo";
const MOCK_DESTINATION_URL =
  "https://assets.example.test/program-logos/e2e.png";

/** Stubs POST /upload-url and the follow-up PUT so onboarding does not need R2. */
async function installProgramLogoUploadMocks(page: Page) {
  await page.route(
    (url) => url.pathname.endsWith("/upload-url"),
    async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          key: "program-logos/e2e",
          signedUrl: MOCK_SIGNED_URL,
          destinationUrl: MOCK_DESTINATION_URL,
        }),
      });
    },
  );

  await page.route(MOCK_SIGNED_URL, async (route) => {
    if (route.request().method() !== "PUT") {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 200, body: "" });
  });
}

function randomOnboardingDomain() {
  const id = nanoid(10).replace(/_/g, "-").toLowerCase();
  return `e2e-${id}.invalid`;
}

/** Client navigations can finish before a sequential waitForURL runs; pair clicks with URL assertions. */
const STEP_NAV_TIMEOUT = 60_000;

test.describe("Dub Partners onboarding", () => {
  /**
   * Retries must be off: a failed run may already own 2 free workspaces (links + this flow); retrying
   * POST /api/workspaces hits FREE_WORKSPACES_LIMIT (403).
   */
  test.describe.configure({ retries: 0 });

  test("complete workspace onboarding with Dub Partners product", async ({
    page,
    baseURL: baseURLParam,
  }) => {
    test.setTimeout(180_000);

    const workspaceName = `Test WS ${nanoid(6)}`;
    const customDomain = randomOnboardingDomain();
    const baseURL = baseURLParam ?? "http://localhost:8888";

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
    ).toBeVisible();

    // Fill workspace name (slug auto-generates)
    await page.getByTestId(testIds.onboarding.workspaceName).fill(workspaceName);

    // Read the auto-generated slug for later assertions
    const slug = await page
      .getByTestId(testIds.onboarding.workspaceSlug)
      .inputValue();
    expect(slug).toBeTruthy();

    const productsHeading = page.getByTestId(testIds.onboarding.stepProducts);

    // Navigation runs in onSuccess after POST + SWR mutate + session.update(); wait for API first (CI).
    const createWorkspacePost = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        new URL(r.url()).pathname === "/api/workspaces",
      { timeout: STEP_NAV_TIMEOUT },
    );
    await page.getByTestId(testIds.onboarding.createWorkspace).click();
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
      page.getByTestId(testIds.onboarding.productCta("partners")).click(),
    ]);

    // Domain step — connect a custom domain
    await expect(page.getByTestId(testIds.onboarding.stepDomain)).toBeVisible({
      timeout: STEP_NAV_TIMEOUT,
    });
    await Promise.all([
      expect(page).toHaveURL(/\/onboarding\/domain\/custom/, {
        timeout: STEP_NAV_TIMEOUT,
      }),
      page.getByTestId(testIds.onboarding.connectDomain).click(),
    ]);

    await expect(
      page.getByTestId(testIds.onboarding.stepDomainCustom),
    ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });

    await page.getByTestId(testIds.onboarding.domainInput).fill(customDomain);
    await expect(
      page.getByTestId(testIds.onboarding.domainAvailable),
    ).toBeVisible({
      timeout: 30_000,
    });
    await Promise.all([
      expect(page).toHaveURL(/\/onboarding\/program/, {
        timeout: STEP_NAV_TIMEOUT,
      }),
      page.getByTestId(testIds.onboarding.addDomain).click(),
    ]);

    // Partner program step
    await expect(
      page.getByTestId(testIds.onboarding.stepProgram),
    ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });

    await page
      .getByTestId(testIds.onboarding.programCompanyName)
      .fill(`Test Program ${nanoid(4)}`);

    await installProgramLogoUploadMocks(page);

    const uploadUrlPost = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        new URL(r.url()).pathname.endsWith("/upload-url"),
      { timeout: STEP_NAV_TIMEOUT },
    );
    await page.getByTestId(testIds.onboarding.programLogo).setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: MINIMAL_PNG,
    });
    const uploadUrlRes = await uploadUrlPost;
    if (!uploadUrlRes.ok()) {
      throw new Error(
        `Logo upload-url failed: HTTP ${uploadUrlRes.status()} ${await uploadUrlRes.text()}`,
      );
    }
    await expect(
      page.getByTestId(testIds.onboarding.programLogoUploaded),
    ).toBeVisible({
      timeout: 30_000,
    });

    await page
      .getByTestId(testIds.onboarding.programDestinationUrl)
      .fill("https://acme.com");
    await page
      .getByTestId(testIds.onboarding.programSupportEmail)
      .fill("support@acme.com");
    await Promise.all([
      expect(page).toHaveURL(/\/onboarding\/program\/reward/, {
        timeout: STEP_NAV_TIMEOUT,
      }),
      page.getByTestId(testIds.onboarding.programContinue).click(),
    ]);

    // Default reward — keep Sale / recurring / percentage defaults, set 30%
    await expect(page.getByTestId(testIds.onboarding.stepReward)).toBeVisible({
      timeout: STEP_NAV_TIMEOUT,
    });
    const pctInput = page.getByTestId(testIds.onboarding.rewardAmount);
    await expect(pctInput).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
    await pctInput.fill("30");
    await Promise.all([
      expect(page).toHaveURL(/\/onboarding\/plan/, {
        timeout: STEP_NAV_TIMEOUT,
      }),
      page.getByTestId(testIds.onboarding.rewardContinue).click(),
    ]);

    // Plan step — mocked checkout trial (no Stripe)
    await expect(page.getByTestId(testIds.onboarding.stepPlan)).toBeVisible({
      timeout: STEP_NAV_TIMEOUT,
    });

    await installBillingCheckoutMocks(page, {
      slug,
      baseURL,
    });

    const advancedPaidCta = page.getByTestId(
      testIds.onboarding.planCta("advanced"),
    );
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
    await finishOnboardingCheckoutWithoutStripeRedirect(page, {
      slug,
      baseURL,
    });

    await expect(
      page.getByTestId(testIds.onboarding.workspaceCreated),
    ).toContainText(workspaceName, { timeout: STEP_NAV_TIMEOUT });
    await expect(
      page.getByTestId(testIds.onboarding.goToDashboard),
    ).toBeVisible({ timeout: STEP_NAV_TIMEOUT });
    await expect(
      page.getByTestId(testIds.onboarding.completeSetup),
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
});
