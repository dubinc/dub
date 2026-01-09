"use client";

import { AddEditDomainForm } from "@/ui/domains/add-edit-domain-form";
import { useSearchParams } from "next/navigation";
import { LaterButton } from "../../../later-button";
import { useOnboardingProgress } from "../../../use-onboarding-progress";

export function Form() {
  const searchParams = useSearchParams();
  const product = searchParams.get("product");

  const { continueTo } = useOnboardingProgress();

  return (
    <div>
      <AddEditDomainForm
        onSuccess={() => {
          continueTo("plan");
        }}
        enableDomainConfig={false}
      />

      {product !== "partners" && <LaterButton next="plan" className="mt-4" />}
    </div>
  );
}
