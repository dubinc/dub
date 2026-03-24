import {
  FREE_PLAN,
  PLANS,
  TRIAL_CAPS,
  isWorkspaceBillingTrialActive,
} from "@dub/utils";

export const getRatelimitForPlan = (plan: string) => {
  const currentPlanName = plan.toLowerCase().split(" ")[0]; // to account for old Business plans (e.g. "Business Plus")
  return (
    PLANS.find((p) => p.name.toLowerCase() === currentPlanName) || FREE_PLAN
  );
};

export const getRatelimitForWorkspace = ({
  plan,
  trialEndsAt,
}: {
  plan: string;
  trialEndsAt?: Date | null;
}) => {
  const base = getRatelimitForPlan(plan);

  if (isWorkspaceBillingTrialActive(trialEndsAt)) {
    return {
      ...base,
      limits: {
        ...base.limits,
        api: TRIAL_CAPS.api,
        analyticsApi: TRIAL_CAPS.analyticsApi,
      },
    };
  }
  return base;
};
