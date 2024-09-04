export const ONBOARDING_STEPS = [
  "workspace",
  "link",
  "domain",
  "domain/custom",
  "invite",
  "plan",
  "completed",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
