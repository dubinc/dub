export const UPGRADE_PLANS = [
  "pro",
  "business",
  "advanced",
  "enterprise",
] as const;

export type UpgradePlan = (typeof UPGRADE_PLANS)[number];

type SearchParamGetter = {
  get: (key: string) => string | null;
};

export function parseUpgradePlan(plan: string | null | undefined) {
  if (!plan) return undefined;
  return UPGRADE_PLANS.includes(plan as UpgradePlan)
    ? (plan as UpgradePlan)
    : undefined;
}

export function parseUpgradeIntent(searchParams: SearchParamGetter) {
  return {
    upgradePlan: parseUpgradePlan(searchParams.get("upgrade_plan")),
    upgradeSource: searchParams.get("upgrade_source") ?? undefined,
    showPartnersUpgradeModal:
      searchParams.get("showPartnersUpgradeModal") === "true",
  };
}

export function buildUpgradeUrl({
  slug,
  upgradePlan,
  upgradeSource,
  showPartnersUpgradeModal,
}: {
  slug?: string | null;
  upgradePlan?: UpgradePlan;
  upgradeSource?: string;
  showPartnersUpgradeModal?: boolean;
}) {
  if (!slug) return "https://dub.co/pricing";

  const params = new URLSearchParams();

  if (upgradePlan) {
    params.set("upgrade_plan", upgradePlan);
  }

  if (upgradeSource) {
    params.set("upgrade_source", upgradeSource);
  }

  if (showPartnersUpgradeModal) {
    params.set("showPartnersUpgradeModal", "true");
  }

  const query = params.toString();
  return query ? `/${slug}/upgrade?${query}` : `/${slug}/upgrade`;
}
