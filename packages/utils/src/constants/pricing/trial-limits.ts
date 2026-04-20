import type { PlanDetails } from "./pricing-plans";

export const TRIAL_PROGRAM_ENROLLMENT_LIMIT = 100;

export const TRIAL_LIMITS = {
  links: 100,
  clicks: 5_000,
  payouts: 100_00,
  domains: 5,
  tags: 5,
  folders: 5,
  groups: 5,
  networkInvites: 0,
  users: 5,
  ai: 100,
  api: 120,
  analyticsApi: 2,
} as const;

export type TrialLimitResource =
  | keyof typeof TRIAL_LIMITS
  | "partnerEnrollments"
  | "dublink";

export const TRIAL_LIMIT_FEATURE_PHRASES: Record<TrialLimitResource, string> = {
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
  dublink: "claim a free .link domain",
};

export function getTrialLimitFeaturePhrase(kind: TrialLimitResource): string {
  return TRIAL_LIMIT_FEATURE_PHRASES[kind];
}

export function getTrialLimitResourceForOverageBanner({
  exceededEvents,
  exceededLinks,
  exceededPayouts,
}: {
  exceededEvents: boolean;
  exceededLinks: boolean;
  exceededPayouts: boolean;
}): TrialLimitResource | null {
  if (exceededEvents) return "clicks";
  if (exceededLinks) return "links";
  if (exceededPayouts) return "payouts";
  return null;
}

export const DUB_TRIAL_PERIOD_DAYS = 14;

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
    links: TRIAL_LIMITS.links,
    clicks: TRIAL_LIMITS.clicks,
    payouts: TRIAL_LIMITS.payouts,
    users: TRIAL_LIMITS.users,
    domains: TRIAL_LIMITS.domains,
    tags: TRIAL_LIMITS.tags,
    folders: TRIAL_LIMITS.folders,
    groups: TRIAL_LIMITS.groups,
    networkInvites: TRIAL_LIMITS.networkInvites,
    ai: TRIAL_LIMITS.ai,
    api: TRIAL_LIMITS.api,
    analyticsApi: TRIAL_LIMITS.analyticsApi,
  };
}
