"use client";

const ONBOARDING_PARTNER_DRAFT_PREFIX = "application-form-partner-data:";
const LEGACY_ONBOARDING_PARTNER_DRAFT_KEY = "application-form-partner-data";

export function clearOnboardingPartnerDrafts() {
  if (typeof window === "undefined") return;

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;

      if (
        key === LEGACY_ONBOARDING_PARTNER_DRAFT_KEY ||
        key.startsWith(ONBOARDING_PARTNER_DRAFT_PREFIX)
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch (error) {
    console.error("Failed to clear onboarding partner drafts", error);
  }
}
