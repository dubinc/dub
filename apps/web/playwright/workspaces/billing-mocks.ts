import "dotenv-flow/config";

import { prisma } from "@dub/prisma";
import type { Prisma } from "@dub/prisma/client";
import {
  BUSINESS_PLAN,
  DUB_TRIAL_PERIOD_DAYS,
  getWorkspaceLimitsForStripeSubscriptionStatus,
} from "@dub/utils";
import type { Page, Request } from "@playwright/test";

const MOCK_CHECKOUT_SESSION_ID = "cs_test_e2e_mock_session";

function parseBillingUpgradeCheckoutContext(req: Request): {
  onboarding: boolean;
  plan: string;
  period: string;
} {
  try {
    const raw = req.postData();
    if (!raw) {
      return { onboarding: false, plan: "business", period: "monthly" };
    }
    const body = JSON.parse(raw) as {
      onboarding?: string | boolean;
      plan?: string;
      period?: string;
    };
    const onboarding = body.onboarding === true || body.onboarding === "true";
    return {
      onboarding,
      plan: typeof body.plan === "string" ? body.plan : "business",
      period: typeof body.period === "string" ? body.period : "monthly",
    };
  } catch {
    return { onboarding: false, plan: "business", period: "monthly" };
  }
}

/** Columns overwritten by {@link applyMockTrialToWorkspace} — snapshot/restore must stay in sync. */
const mockTrialWorkspaceColumns = {
  plan: true,
  subscriptionCanceledAt: true,
  billingCycleEndsAt: true,
  planTier: true,
  planPeriod: true,
  trialEndsAt: true,
  billingCycleStart: true,
  stripeId: true,
  usageLimit: true,
  linksLimit: true,
  payoutsLimit: true,
  domainsLimit: true,
  aiLimit: true,
  tagsLimit: true,
  foldersLimit: true,
  groupsLimit: true,
  networkInvitesLimit: true,
  usersLimit: true,
  paymentFailedAt: true,
} as const;

export type BillingMockTrialWorkspaceSnapshot = Prisma.ProjectGetPayload<{
  select: typeof mockTrialWorkspaceColumns;
}>;

export async function captureWorkspaceBillingTrialSnapshot(
  slug: string,
): Promise<BillingMockTrialWorkspaceSnapshot> {
  return prisma.project.findUniqueOrThrow({
    where: { slug },
    select: mockTrialWorkspaceColumns,
  });
}

export async function restoreWorkspaceBillingTrialSnapshot(
  slug: string,
  snapshot: BillingMockTrialWorkspaceSnapshot,
): Promise<void> {
  await prisma.project.update({
    where: { slug },
    data: {
      plan: snapshot.plan,
      subscriptionCanceledAt: snapshot.subscriptionCanceledAt,
      billingCycleEndsAt: snapshot.billingCycleEndsAt,
      planTier: snapshot.planTier,
      planPeriod: snapshot.planPeriod,
      trialEndsAt: snapshot.trialEndsAt,
      billingCycleStart: snapshot.billingCycleStart,
      stripeId: snapshot.stripeId,
      usageLimit: snapshot.usageLimit,
      linksLimit: snapshot.linksLimit,
      payoutsLimit: snapshot.payoutsLimit,
      domainsLimit: snapshot.domainsLimit,
      aiLimit: snapshot.aiLimit,
      tagsLimit: snapshot.tagsLimit,
      foldersLimit: snapshot.foldersLimit,
      groupsLimit: snapshot.groupsLimit,
      networkInvitesLimit: snapshot.networkInvitesLimit,
      usersLimit: snapshot.usersLimit,
      paymentFailedAt: snapshot.paymentFailedAt,
    },
  });
}

/**
 * Writes trialing Business state directly to the DB (mock path — no Stripe API or webhooks).
 */
export async function applyMockTrialToWorkspace(slug: string) {
  const limits = getWorkspaceLimitsForStripeSubscriptionStatus({
    planLimits: BUSINESS_PLAN.limits,
    subscriptionStatus: "trialing",
  });

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + DUB_TRIAL_PERIOD_DAYS);

  await prisma.project.update({
    where: { slug },
    data: {
      plan: "business",
      subscriptionCanceledAt: null,
      billingCycleEndsAt: null,
      planTier: 1,
      planPeriod: "monthly",
      trialEndsAt,
      billingCycleStart: new Date().getDate(),
      stripeId: `cus_e2e_mock_${slug}`,
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
  /** Mirrors last POST to billing/upgrade — used when Hosted Checkout redirects (no body). */
  let pendingCheckout = {
    onboarding: false,
    plan: "business",
    period: "monthly",
  };

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
      pendingCheckout = parseBillingUpgradeCheckoutContext(route.request());
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
    const { onboarding, plan, period } = pendingCheckout;
    // Same path/query shape as stripe.checkout.sessions.create success_url in
    // app/api/workspaces/[idOrSlug]/billing/upgrade/route.ts — origin from baseURL
    // keeps Playwright on the app host (cookies), unlike APP_DOMAIN in local dev.
    const successUrl = onboarding
      ? `${origin}/onboarding/success?workspace=${encodeURIComponent(slug)}`
      : `${origin}/${slug}?upgraded=true&plan=${encodeURIComponent(plan)}&period=${encodeURIComponent(period)}`;
    await route.fulfill({
      status: 302,
      headers: { Location: successUrl },
    });
  });
}
