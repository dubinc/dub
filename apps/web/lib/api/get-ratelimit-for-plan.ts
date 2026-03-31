import { FREE_PLAN, PLANS } from "@dub/utils";

export const getRatelimitForPlan = (plan: string) => {
  const currentPlanName = plan.toLowerCase().split(" ")[0]; // to account for old Business plans (e.g. "Business Plus")
  return (
    PLANS.find((p) => p.name.toLowerCase() === currentPlanName) || FREE_PLAN
  );
};
