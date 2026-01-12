import { NextButton } from "../../../next-button";
import { StepPage } from "../../step-page";

export default function ProgramReward() {
  return (
    <StepPage
      title="Create your default reward"
      description="The default reward offered to your partners"
    >
      <NextButton step="plan" />
    </StepPage>
  );
}
