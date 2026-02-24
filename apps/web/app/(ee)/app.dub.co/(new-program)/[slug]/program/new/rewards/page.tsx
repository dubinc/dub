import { StepPage } from "../step-page";
import { Form } from "./form";

export default async function ProgramOnboardingRewardsPage() {
  return (
    <StepPage title="Create default reward">
      <Form />
    </StepPage>
  );
}
