import { PLANS } from "@dub/utils";

/**
 * Check if a plan has access to partner programs (payouts limit > 0)
 * Free & Pro: payouts = 0 (no access)
 * Business+: payouts > 0 (has access)
 */
export function planHasPartnerAccess(planName: string): boolean {
  const plan = PLANS.find(
    (p) => p.name.toLowerCase() === planName.toLowerCase(),
  );
  return plan ? plan.limits.payouts > 0 : false;
}

/**
 * Check if changing from currentPlan to newPlan would lose partner access
 * @param currentPlan - The current plan name
 * @param newPlan - The new plan name (null for cancellation)
 * @returns true if the change would result in losing partner access
 */
export function wouldLosePartnerAccess({
  currentPlan,
  newPlan,
}: {
  currentPlan: string;
  newPlan: string | null;
}): boolean {
  const hasCurrentAccess = planHasPartnerAccess(currentPlan);

  // If canceling subscription (newPlan is null), they lose access if they currently have it
  if (newPlan === null) {
    return hasCurrentAccess;
  }

  const hasNewAccess = planHasPartnerAccess(newPlan);

  // Losing access means going from having access to not having access
  return hasCurrentAccess && !hasNewAccess;
}
