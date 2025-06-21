export const ONBOARDING_STEPS = [
  "workspace",
  "domain",
  "domain/custom",
  "domain/register",
  "invite",
  "usage",
  "plan",
  "completed",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
