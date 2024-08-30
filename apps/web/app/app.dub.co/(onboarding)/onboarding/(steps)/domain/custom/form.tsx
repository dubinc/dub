"use client";

import { AddEditDomainForm } from "@/ui/domains/add-edit-domain-form";
import { useOnboardingProgress } from "../../../use-onboarding-progress";

export function Form() {
  const { continueTo } = useOnboardingProgress();

  return (
    <div>
      <AddEditDomainForm
        onSuccess={() => {
          continueTo("invite");
        }}
        showAdvancedOptions={false}
      />
      <button
        type="button"
        onClick={() => continueTo("invite")}
        className="mt-4 w-full text-center text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        I'll do this later
      </button>
    </div>
  );
}
