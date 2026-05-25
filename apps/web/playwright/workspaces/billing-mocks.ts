import "dotenv-flow/config";

import { prisma } from "@dub/prisma";
import type { Prisma } from "@dub/prisma/client";
import {
  DUB_TRIAL_PERIOD_DAYS,
  getWorkspaceLimitsForStripeSubscriptionStatus,
  PLANS,
} from "@dub/utils";
import type { Page, Request } from "@playwright/test";

function getTrialingLimitsForPlan(planId: string) {
  const planDetails = PLANS.find(
    (p) => p.name.toLowerCase() === planId.toLowerCase(),
  );
  if (!planDetails) {
    throw new Error(`applyMockTrialToWorkspace: unknown plan "${planId}"`);
  }
  return getWorkspaceLimitsForStripeSubscriptionStatus({
    planLimits: planDetails.limits,
    subscriptionStatus: "trialing",
  });
}

const MOCK_CHECKOUT_SESSION_ID = "cs_test_e2e_mock_session";

/** Synthetic path used in the browser before Hosted Checkout is mocked (see redirectToCheckout stub). */
const MOCK_CHECKOUT_PATH_TOKEN = "cs_test_e2e_redirect";

/**
 * Ensures `window.Stripe` short-circuits @stripe/stripe-js and redirects to our mock checkout URL.
 * Call again immediately before clicking "Start trial" if anything may have replaced `window.Stripe`.
 */
export async function patchStripeRedirectStubForE2E(page: Page) {
  await page.evaluate((pathToken) => {
    const w = window as Window & { Stripe?: unknown };
    w.Stripe = function Stripe() {
      return {
        redirectToCheckout(opts: { sessionId?: string }) {
          const id = opts?.sessionId ? String(opts.sessionId) : "";
          window.location.href = `https://checkout.stripe.com/c/pay/${pathToken}#${encodeURIComponent(id)}`;
        },
      };
    };
  }, MOCK_CHECKOUT_PATH_TOKEN);
}

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
  partnerTagsLimit: true,
  foldersLimit: true,
  groupsLimit: true,
  networkInvitesLimit: true,
  partnersLimit: true,
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
      partnerTagsLimit: snapshot.partnerTagsLimit,
      foldersLimit: snapshot.foldersLimit,
      groupsLimit: snapshot.groupsLimit,
      networkInvitesLimit: snapshot.networkInvitesLimit,
      partnersLimit: snapshot.partnersLimit,
      usersLimit: snapshot.usersLimit,
      paymentFailedAt: snapshot.paymentFailedAt,
    },
  });
}

/** Writes trialing state to the DB (mock path — no Stripe). Defaults to business. */
export async function applyMockTrialToWorkspace(
  slug: string,
  options?: { plan?: string; period?: "monthly" | "yearly" },
) {
  const plan = (options?.plan ?? "business").toLowerCase();
  const period = options?.period ?? "monthly";
  const limits = getTrialingLimitsForPlan(plan);

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + DUB_TRIAL_PERIOD_DAYS);

  await prisma.project.update({
    where: { slug },
    data: {
      plan,
      subscriptionCanceledAt: null,
      billingCycleEndsAt: null,
      planTier: 1,
      planPeriod: period,
      trialEndsAt,
      billingCycleStart: new Date().getDate(),
      stripeId: `cus_e2e_mock_${slug}`,
      usageLimit: limits.clicks,
      linksLimit: limits.links,
      payoutsLimit: limits.payouts,
      domainsLimit: limits.domains,
      aiLimit: limits.ai,
      tagsLimit: limits.tags,
      partnerTagsLimit: limits.partnerTags,
      foldersLimit: limits.folders,
      groupsLimit: limits.groups,
      networkInvitesLimit: limits.networkInvites,
      partnersLimit: limits.partners,
      usersLimit: limits.users,
      paymentFailedAt: null,
    },
  });
}

/** Mirrors activate-paid-plan success: trial ended, subscription treated as active in UI. */
export async function applyMockActivatedPaidPlan(slug: string) {
  await prisma.project.update({
    where: { slug },
    data: { trialEndsAt: null },
  });
}

/**
 * Use after a mocked `POST .../billing/upgrade` during onboarding when the app would call
 * `redirectToCheckout`. Real Stripe.js over HTTP logs warnings and can block redirects when
 * live publishable keys are loaded; this matches the checkout mock: trial in DB + success URL.
 */
export async function finishOnboardingCheckoutWithoutStripeRedirect(
  page: Page,
  options: { slug: string; baseURL: string },
) {
  const { slug, baseURL } = options;
  const origin = baseURL.replace(/\/$/, "");
  await applyMockTrialToWorkspace(slug);
  await page.goto(
    `${origin}/onboarding/success?workspace=${encodeURIComponent(slug)}`,
    { waitUntil: "load" },
  );
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

  await patchStripeRedirectStubForE2E(page);

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
    const url = req.url();
    // Do not rely on isNavigationRequest() — client-side location.assign to checkout can be flaky.
    if (!url.includes(MOCK_CHECKOUT_PATH_TOKEN)) {
      await route.continue();
      return;
    }
    const { onboarding, plan, period } = pendingCheckout;
    await applyMockTrialToWorkspace(slug, {
      plan,
      period: period as "monthly" | "yearly",
    });
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

  await patchStripeRedirectStubForE2E(page);
}
