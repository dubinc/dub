"use client";

import { RegisterDomainForm } from "@/ui/domains/register-domain-form";
import { useOnboardingProduct } from "../../../use-onboarding-product";
import { useOnboardingProgress } from "../../../use-onboarding-progress";

export function Form() {
  const product = useOnboardingProduct();
  const { continueTo } = useOnboardingProgress();

  return (
    <RegisterDomainForm
      saveOnly
      onSuccess={() => {
        continueTo(product === "partners" ? "program" : "plan");
      }}
    />
  );
}
