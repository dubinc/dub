type UpgradeRecommendation = {
  plan: string;
  planTier?: number;
};

const FEATURE_RECOMMENDATIONS: Record<string, UpgradeRecommendation> = {
  pro: {
    plan: "pro",
  },
  business: {
    plan: "business",
  },
  advanced: {
    plan: "advanced",
  },
  partners: {
    plan: "advanced",
    planTier: 2,
  },
};

export function getBillingUpgradePath({
  slug,
  recommendation,
  showPartnersUpgradeModal,
}: {
  slug?: string;
  recommendation?: UpgradeRecommendation;
  showPartnersUpgradeModal?: boolean;
}) {
  if (!slug) {
    return "https://dub.co/pricing";
  }

  const queryParams = new URLSearchParams();

  if (recommendation) {
    queryParams.set("plan", recommendation.plan);
    if (recommendation.planTier && recommendation.planTier > 1) {
      queryParams.set("planTier", recommendation.planTier.toString());
    }
  }

  if (showPartnersUpgradeModal) {
    queryParams.set("showPartnersUpgradeModal", "true");
  }

  const query = queryParams.toString();
  return `/${slug}/settings/billing/upgrade${query ? `?${query}` : ""}`;
}

export function getBillingUpgradePathForFeature({
  slug,
  feature,
  showPartnersUpgradeModal,
}: {
  slug?: string;
  feature: keyof typeof FEATURE_RECOMMENDATIONS;
  showPartnersUpgradeModal?: boolean;
}) {
  return getBillingUpgradePath({
    slug,
    recommendation: FEATURE_RECOMMENDATIONS[feature],
    showPartnersUpgradeModal,
  });
}
