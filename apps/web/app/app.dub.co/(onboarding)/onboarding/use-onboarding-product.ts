"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export const ONBOARDING_PRODUCTS = ["links", "partners"] as const;
export type OnboardingProduct = (typeof ONBOARDING_PRODUCTS)[number];

export function useOnboardingProduct(): OnboardingProduct {
  const searchParams = useSearchParams();
  const param = searchParams.get("product");

  return useMemo(
    () => ONBOARDING_PRODUCTS.find((p) => p === param) || "links",
    [param],
  );
}
