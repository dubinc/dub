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

export type TrialLimitKind =
  | keyof typeof TRIAL_CAPS
  | "partnerEnrollments"
  | "dublink";

export const TRIAL_LIMIT_FEATURE_PHRASES: Record<TrialLimitKind, string> = {
  links: "create more links",
  clicks: "track more events",
  payouts: "send a payout",
  domains: "add more domains",
  tags: "create more tags",
  folders: "create more folders",
  groups: "create more groups",
  networkInvites: "invite more partners from the network",
  users: "invite more teammates",
  ai: "use more AI credits",
  api: "make more API requests",
  analyticsApi: "use the Analytics API more",
  partnerEnrollments: "add more partners",
  dublink: "claim a fee .link domain",
};

export function getTrialLimitFeaturePhrase(kind: TrialLimitKind): string {
  return TRIAL_LIMIT_FEATURE_PHRASES[kind];
}

export function getTrialLimitKindForOverageBanner({
  exceededEvents,
  exceededLinks,
  exceededPayouts,
}: {
  exceededEvents: boolean;
  exceededLinks: boolean;
  exceededPayouts: boolean;
}): TrialLimitKind {
  if (exceededEvents) return "clicks";
  if (exceededLinks) return "links";
  if (exceededPayouts) return "payouts";
  return "payouts";
}

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
    payouts: TRIAL_CAPS.payouts,
    users: TRIAL_CAPS.users,
    domains: TRIAL_CAPS.domains,
    tags: TRIAL_CAPS.tags,
    folders: TRIAL_CAPS.folders,
    groups: TRIAL_CAPS.groups,
    networkInvites: TRIAL_CAPS.networkInvites,
    ai: TRIAL_CAPS.ai,
  };
}
