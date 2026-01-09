"use client";

import { AddEditDomainForm } from "@/ui/domains/add-edit-domain-form";
import { LaterButton } from "../../../later-button";
import { useOnboardingProgress } from "../../../use-onboarding-progress";

export function Form() {
  const { continueTo } = useOnboardingProgress();

  return (
    <div>
      <AddEditDomainForm
        onSuccess={() => {
          continueTo("plan");
        }}
        enableDomainConfig={false}
      />
      <LaterButton next="plan" className="mt-4" />
    </div>
  );
}
