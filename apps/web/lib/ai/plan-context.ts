import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { PLANS } from "@dub/utils";

export type PlanSummary = {
  name: string;
  order: number;
  featureTitle?: string;
  features: string[];
  capabilities: ReturnType<typeof getPlanCapabilities>;
};

export function getPlanSummaries(): PlanSummary[] {
  const summaries = PLANS.map((plan, index) => ({
    name: plan.name,
    order: index + 1,
    featureTitle: plan.featureTitle,
    features: plan.features?.map((feature) => feature.text) ?? [],
    capabilities: getPlanCapabilities(plan.name.toLowerCase()),
  }));

  return summaries;
}
