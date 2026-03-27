import "dotenv-flow/config";

import { prisma } from "@dub/prisma";
import {
  getWorkspaceLimitsForStripeSubscriptionStatus,
  PARTNER_CHECKOUT_TRIAL_PERIOD_DAYS,
  PRO_PLAN,
} from "@dub/utils";
import type { Page } from "@playwright/test";

const MOCK_CHECKOUT_SESSION_ID = "cs_test_e2e_mock_session";

/**
 * Writes trialing Pro state directly to the DB (mock path — no Stripe API or webhooks).
 */
async function applyMockTrialToWorkspace(slug: string) {
  const limits = getWorkspaceLimitsForStripeSubscriptionStatus({
    planLimits: PRO_PLAN.limits,
    subscriptionStatus: "trialing",
  });

  const trialEndsAt = new Date();
  trialEndsAt.setDate(
    trialEndsAt.getDate() + PARTNER_CHECKOUT_TRIAL_PERIOD_DAYS,
  );

  await prisma.project.update({
    where: { slug },
    data: {
      plan: "pro",
      planTier: 1,
      planPeriod: "monthly",
      trialEndsAt,
      billingCycleStart: new Date().getDate(),
      usageLimit: limits.clicks,
      linksLimit: limits.links,
      payoutsLimit: limits.payouts,
      domainsLimit: limits.domains,
      aiLimit: limits.ai,
      tagsLimit: limits.tags,
      foldersLimit: limits.folders,
      groupsLimit: limits.groups,
      networkInvitesLimit: limits.networkInvites,
      usersLimit: limits.users,
      paymentFailedAt: null,
    },
  });
}

/**
 * Intercepts the upgrade API so the dev server never calls Stripe, and
 * intercepts Hosted Checkout navigation so Stripe never loads a fake session id
 * (which throws CheckoutInitError). Trial state is applied with Prisma — no
 * Stripe keys or webhooks needed.
 */
export async function installBillingCheckoutMocks(
  page: Page,
  options: { slug: string; baseURL: string },
) {
  const { slug, baseURL } = options;
  const origin = baseURL.replace(/\/$/, "");
  const successUrl = `${origin}/${slug}?upgraded=true&plan=pro&period=monthly`;

  await page.route("https://js.stripe.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript; charset=utf-8",
      body: `
        window.Stripe = function Stripe() {
          return {
            redirectToCheckout: function (opts) {
              var id = opts && opts.sessionId ? String(opts.sessionId) : "";
              window.location.href =
                "https://checkout.stripe.com/c/pay/cs_test_e2e_redirect#" +
                encodeURIComponent(id);
            },
          };
        };
      `,
    });
  });

  await page.route(
    (url) => url.pathname === `/api/workspaces/${slug}/billing/upgrade`,
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
      headers: { Location: successUrl },
    });
  });
}
