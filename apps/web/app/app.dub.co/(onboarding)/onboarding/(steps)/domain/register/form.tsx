"use client";

import { RegisterDomainForm } from "@/ui/domains/register-domain-form";
import { LaterButton } from "../../../later-button";
import { useOnboardingProduct } from "../../../use-onboarding-product";
import { useOnboardingProgress } from "../../../use-onboarding-progress";

export function Form() {
  const { continueTo } = useOnboardingProgress();
  const product = useOnboardingProduct();

  return (
    <div>
      <RegisterDomainForm
        saveOnly
        onSuccess={() => {
          continueTo(product === "partners" ? "program" : "plan");
        }}
      />

      {product !== "partners" && <LaterButton next="plan" className="mt-4" />}
    </div>
  );
}
