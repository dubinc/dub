import { StepPage } from "../../step-page";
import { Form } from "./form";

export default function Register() {
  return (
    <StepPage
      title="Claim your free .link domain"
      paidPlanRequired={true}
      description="Exclusively free for a year"
    >
      <Form />
    </StepPage>
  );
}
