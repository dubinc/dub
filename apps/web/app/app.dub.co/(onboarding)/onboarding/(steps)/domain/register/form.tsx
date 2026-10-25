"use client";

import { RegisterDomainForm } from "@/ui/domains/register-domain-form";
import { useOnboardingProgress } from "../../../use-onboarding-progress";

export function Form() {
  const { continueTo } = useOnboardingProgress();

  return (
    <RegisterDomainForm
      saveOnly
      onSuccess={() => {
        continueTo("plan");
      }}
    />
  );
}
