"use client";

import { Bolt, withFillVariant } from "@dub/ui";
import { StepPage } from "../../step-page";
import { Form } from "./form";

export default function Register() {
  return (
    <StepPage
      title="Claim your free .link domain"
      badge={{
        icon: withFillVariant(Bolt),
        label: "Instant setup",
      }}
      description="Exclusively free for one year"
      paidPlanRequired
    >
      <Form />
    </StepPage>
  );
}
