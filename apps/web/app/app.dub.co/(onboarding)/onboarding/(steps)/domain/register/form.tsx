"use client";

import { RegisterDomainForm } from "@/ui/domains/register-domain-form";
import { useSearchParams } from "next/navigation";
import { LaterButton } from "../../../later-button";
import { useOnboardingProgress } from "../../../use-onboarding-progress";

export function Form() {
  const { continueTo } = useOnboardingProgress();
  const searchParams = useSearchParams();
  const product = searchParams.get("product");

  return (
    <div>
      <RegisterDomainForm
        saveOnly
        onSuccess={() => {
          continueTo("plan");
        }}
      />

      {product !== "partners" && <LaterButton next="plan" className="mt-4" />}
    </div>
  );
}
