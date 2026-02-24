export const ONBOARDING_STEPS = [
  "workspace",
  "products",
  "domain",
  "domain/custom",
  "domain/register",
  "program",
  "program/reward",
  "plan",
  "success",
  "completed",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
