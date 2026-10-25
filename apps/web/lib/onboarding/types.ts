export const ONBOARDING_STEPS = [
  "workspace",
  "domain",
  "domain/custom",
  "domain/register",
  "plan",
  "success",
  "completed",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
