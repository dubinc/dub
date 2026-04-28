"use client";

import { AddEditDomainForm } from "@/ui/domains/add-edit-domain-form";
import { useSearchParams } from "next/navigation";
import { useOnboardingProduct } from "../../../use-onboarding-product";
import { useOnboardingProgress } from "../../../use-onboarding-progress";

export function Form() {
  const searchParams = useSearchParams();
  const workspaceSlug = searchParams.get("workspace") ?? "company";
  const product = useOnboardingProduct();
  const { continueTo } = useOnboardingProgress();

  return (
    <AddEditDomainForm
      initialDomain={`${workspaceSlug}.dub.link`}
      fixedDomainSuffix="dub.link"
      enableDomainConfig={false}
      onSuccess={() => {
        continueTo(product === "partners" ? "program" : "plan");
      }}
    />
  );
}
