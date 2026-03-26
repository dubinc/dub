import "dotenv-flow/config";

import { prisma } from "@dub/prisma";
import {
  FREE_PLAN,
  getWorkspaceLimitsForStripeSubscriptionStatus,
  PARTNER_CHECKOUT_TRIAL_PERIOD_DAYS,
  PRO_PLAN,
} from "@dub/utils";

/**
 * Puts the seeded workspace back on Free so the upgrade page shows “Upgrade”
 * again (repeatable mocked runs).
 */
export async function resetE2eWorkspaceForBillingTest(slug: string) {
  const l = FREE_PLAN.limits;
  await prisma.project.update({
    where: { slug },
    data: {
      plan: "free",
      planTier: 1,
      planPeriod: null,
      trialEndsAt: null,
      stripeId: null,
      usageLimit: l.clicks,
      linksLimit: l.links,
      payoutsLimit: l.payouts,
      domainsLimit: l.domains,
      aiLimit: l.ai,
      tagsLimit: l.tags,
      foldersLimit: l.folders,
      groupsLimit: l.groups,
      networkInvitesLimit: l.networkInvites,
      usersLimit: l.users,
      paymentFailedAt: null,
    },
  });
}

/**
 * Simulates post-checkout trial state without Stripe webhooks (used by mocked
 * billing E2E). Matches the limits applied for a trialing Pro subscription.
 */
export async function applyMockTrialToWorkspace(slug: string) {
  const limits = getWorkspaceLimitsForStripeSubscriptionStatus({
    planLimits: PRO_PLAN.limits,
    subscriptionStatus: "trialing",
  });

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + PARTNER_CHECKOUT_TRIAL_PERIOD_DAYS);

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
