"use client";

import { ONBOARDING_PAYOUTS_VISIT_SESSION_KEY } from "./constants";

const ONBOARDING_PARTNER_DRAFT_PREFIX = "application-form-partner-data:";
const LEGACY_ONBOARDING_PARTNER_DRAFT_KEY = "application-form-partner-data";

export function clearOnboardingPartnerDrafts() {
  if (typeof window === "undefined") return;

  try {
    Object.keys(window.localStorage).forEach((key) => {
      if (
        key === LEGACY_ONBOARDING_PARTNER_DRAFT_KEY ||
        key.startsWith(ONBOARDING_PARTNER_DRAFT_PREFIX)
      ) {
        window.localStorage.removeItem(key);
      }
    });

    window.sessionStorage.removeItem(ONBOARDING_PAYOUTS_VISIT_SESSION_KEY);
  } catch (error) {
    console.error("Failed to clear onboarding partner drafts", error);
  }
}
