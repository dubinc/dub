import type { Page } from "@playwright/test";

import { applyMockTrialToWorkspace } from "./apply-mock-trial";

const MOCK_CHECKOUT_SESSION_ID = "cs_test_e2e_mock_session";

/**
 * Intercepts the upgrade API so the dev server never calls Stripe, and
 * intercepts Hosted Checkout navigation so Stripe never loads a fake session id
 * (which throws CheckoutInitError). Trial state is applied with Prisma
 * (`apply-mock-trial.ts`) — no Stripe keys or webhooks.
 */
export async function installBillingCheckoutMocks(
  page: Page,
  options: { slug: string; baseURL: string },
) {
  const { slug, baseURL } = options;
  const origin = baseURL.replace(/\/$/, "");
  const successUrl = `${origin}/${slug}?upgraded=true&plan=pro&period=monthly`;

  const isUpgradePost = (url: URL) =>
    url.pathname === `/api/workspaces/${slug}/billing/upgrade`;

  await page.route(
    (url) => isUpgradePost(url),
    async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: MOCK_CHECKOUT_SESSION_ID }),
      });
    },
  );

  await page.route("https://checkout.stripe.com/**", async (route) => {
    const req = route.request();
    if (!req.isNavigationRequest() && req.resourceType() !== "document") {
      await route.continue();
      return;
    }
    await applyMockTrialToWorkspace(slug);
    await route.fulfill({
      status: 302,
      headers: {
        Location: successUrl,
      },
    });
  });
}
