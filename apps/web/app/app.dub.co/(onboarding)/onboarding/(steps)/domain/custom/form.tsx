"use client";

import { AddEditDomainForm } from "@/ui/domains/add-edit-domain-form";
import { LaterButton } from "../../../later-button";
import { useOnboardingProduct } from "../../../use-onboarding-product";
import { useOnboardingProgress } from "../../../use-onboarding-progress";

export function Form() {
  const product = useOnboardingProduct();

  const { continueTo } = useOnboardingProgress();

  return (
    <div>
      <AddEditDomainForm
        onSuccess={() => {
          continueTo(product === "partners" ? "program" : "plan");
        }}
        enableDomainConfig={false}
      />

      {product !== "partners" && <LaterButton next="plan" className="mt-4" />}
    </div>
  );
}
