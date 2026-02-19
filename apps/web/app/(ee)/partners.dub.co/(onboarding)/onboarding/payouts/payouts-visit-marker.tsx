"use client";

import { ONBOARDING_PAYOUTS_VISIT_SESSION_KEY } from "@/lib/onboarding/constants";
import { useEffect } from "react";

export function PayoutsVisitMarker() {
  useEffect(() => {
    sessionStorage.setItem(ONBOARDING_PAYOUTS_VISIT_SESSION_KEY, "true");
  }, []);

  return null;
}
