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
      paidPlanRequired={true}
      badge={
        product === "partners"
          ? {
              icon: BoltFill,
              label: "Instant setup",
            }
          : undefined
      }
      description="Exclusively free for one year"
    >
      <Form />
    </StepPage>
  );
}
