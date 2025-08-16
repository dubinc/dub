import { OnboardingUsageSchema } from "@/lib/zod/schemas/workspaces";
import { z } from "zod";
import { PLAN_SELECTOR_PLANS } from "../plan/plan-selector";

export function getRecommendedPlan({
  links,
  clicks,
  conversions,
  partners,
}: z.infer<typeof OnboardingUsageSchema>) {
  const hasConversions = (plan: string) => plan !== "free" && plan !== "pro";
  const hasPartners = (plan: string) => plan !== "free" && plan !== "pro";

  const plans = PLAN_SELECTOR_PLANS.filter(
    (plan) =>
      (!conversions || hasConversions(plan.name.toLowerCase())) &&
      (!partners || hasPartners(plan.name.toLowerCase())) &&
      links <= plan.limits.links &&
      clicks <= plan.limits.clicks,
  ).sort((a, b) => (a.price.monthly ?? 0) - (b.price.monthly ?? 0));

  return plans?.[0]?.name?.toLowerCase() ?? "enterprise";
}
