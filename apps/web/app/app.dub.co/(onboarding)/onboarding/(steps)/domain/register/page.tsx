"use client";

import { BoltFill } from "@dub/ui";
import { useSearchParams } from "next/navigation";
import { StepPage } from "../../step-page";
import { Form } from "./form";

export default function Register() {
  const searchParams = useSearchParams();
  const product = searchParams.get("product");

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
