import type { PlanDetails } from "./pricing-plans";

export const TRIAL_PARTNER_ENROLLMENT_CAP = 100;

export const TRIAL_CAPS = {
  links: 100,
  clicks: 5_000,
  payouts: 0,
  domains: 5,
  tags: 10,
  folders: 5,
  groups: 5,
  networkInvites: 0,
  users: 3,
  ai: 1_000,
  api: 120,
  analyticsApi: 2,
} as const;

export const PARTNER_CHECKOUT_TRIAL_PERIOD_DAYS = 14;

export function isWorkspaceBillingTrialActive(
  trialEndsAt: Date | string | null | undefined,
): boolean {
  if (trialEndsAt == null) return false;
  const d = trialEndsAt instanceof Date ? trialEndsAt : new Date(trialEndsAt);
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
}

type WorkspaceLimitFields = PlanDetails["limits"];

export function getWorkspaceLimitsForStripeSubscriptionStatus({
  planLimits,
  subscriptionStatus,
}: {
  planLimits: WorkspaceLimitFields;
  subscriptionStatus: string;
}): WorkspaceLimitFields {
  if (subscriptionStatus !== "trialing") {
    return planLimits;
  }

  return {
    ...planLimits,
    links: TRIAL_CAPS.links,
    clicks: TRIAL_CAPS.clicks,
    users: TRIAL_CAPS.users,
  };
}
