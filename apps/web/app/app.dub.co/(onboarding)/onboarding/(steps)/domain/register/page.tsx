import { Globe } from "@dub/ui/src/icons";
import { StepPage } from "../../step-page";
import { Form } from "./form";

export default function Register() {
  return (
    <StepPage
      icon={Globe}
      title="Claim your free .link domain"
      paidPlanRequired={true}
      description="Exclusively free for a year"
    >
      <Form />
    </StepPage>
  );
}
