import { getPlanCapabilities } from "@/lib/plan-capabilities";

export function wouldLoseAdvancedRewardLogic({
  currentPlan,
  newPlan,
}: {
  currentPlan: string;
  newPlan: string;
}): boolean {
  const had = getPlanCapabilities(currentPlan).canUseAdvancedRewardLogic;
  const has = getPlanCapabilities(newPlan).canUseAdvancedRewardLogic;
  return had && !has;
}

export function leftAdvancedPlan({
  currentPlan,
  newPlan,
}: {
  currentPlan: string;
  newPlan: string;
}): boolean {
  return (
    currentPlan.toLowerCase() === "advanced" &&
    newPlan.toLowerCase() !== "advanced"
  );
}
