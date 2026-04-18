export function wouldLoseAdvancedFeatures({
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
