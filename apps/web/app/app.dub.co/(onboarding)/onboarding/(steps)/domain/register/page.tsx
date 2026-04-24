"use client";

import { BoltFill } from "@dub/ui";
import { useOnboardingProduct } from "../../../use-onboarding-product";
import { StepPage } from "../../step-page";
import { Form } from "./form";

export default function Register() {
  const product = useOnboardingProduct();

  return (
    <StepPage
      title="Claim your free .link domain"
      badge={{
        icon: BoltFill,
        label: "Instant setup",
      }}
      description="Exclusively free for one year"
      paidPlanRequired
    >
      <Form />
    </StepPage>
  );
}
