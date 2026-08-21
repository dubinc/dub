import {
  FREE_PLAN,
  PLANS,
  TRIAL_LIMITS,
  isWorkspaceBillingTrialActive,
} from "@dub/utils";

export const getRatelimitForPlan = (
  plan: string,
  options?: { trialEndsAt?: Date | null },
) => {
  const currentPlanName = plan.toLowerCase().split(" ")[0]; // to account for old Business plans (e.g. "Business Plus")
  const base =
    PLANS.find((p) => p.name.toLowerCase() === currentPlanName) || FREE_PLAN;

  if (isWorkspaceBillingTrialActive(options?.trialEndsAt)) {
    return {
      ...base,
      limits: {
        ...base.limits,
        api: TRIAL_LIMITS.api,
        analyticsApi: TRIAL_LIMITS.analyticsApi,
      },
    };
  }
  return base;
};
