"use client";

import { ONBOARDING_PAYOUTS_VISIT_SESSION_KEY } from "@/ui/partners/use-country-change-warning-modal";
import { useEffect } from "react";

export function PayoutsVisitMarker() {
  useEffect(() => {
    sessionStorage.setItem(ONBOARDING_PAYOUTS_VISIT_SESSION_KEY, "true");
  }, []);

  return null;
}
