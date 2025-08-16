import { StepPage } from "../step-page";
import { Form } from "./form";

export default async function ProgramOnboardingRewardsPage() {
  return (
    <StepPage title="Configure rewards">
      <Form />
    </StepPage>
  );
}
