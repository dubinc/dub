export const TRIAL_LIMITS = {
  links: 100,
  clicks: 5_000,
  domains: 5,
  tags: 5,
  folders: 5,
  users: 3,
  ai: 100,
  api: 120,
  analyticsApi: 2,
} as const;

export type TrialLimitResource =
  | keyof typeof TRIAL_LIMITS
  | "freeDotLinkDomain";

const TRIAL_LIMIT_FEATURE_PHRASES: Record<TrialLimitResource, string> = {
  links: "create more links",
  clicks: "track more events",
  domains: "add more domains",
  tags: "create more tags",
  folders: "create more folders",
  users: "invite more teammates",
  freeDotLinkDomain: "claim a free .link domain",
  // unused fields
  ai: "",
  api: "",
  analyticsApi: "",
};

export function getTrialLimitFeaturePhrase(kind: TrialLimitResource): string {
  return TRIAL_LIMIT_FEATURE_PHRASES[kind];
}

export function getTrialLimitResourceForOverageBanner({
  exceededEvents,
  exceededLinks,
}: {
  exceededEvents: boolean;
  exceededLinks: boolean;
}): TrialLimitResource | null {
  if (exceededEvents) return "clicks";
  if (exceededLinks) return "links";
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
