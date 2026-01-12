import { NextButton } from "../../next-button";
import { StepPage } from "../step-page";

export default function Program() {
  return (
    <StepPage
      title="Create your partner program"
      description="Set up your program in a few steps"
    >
      <NextButton step="program/reward" />
    </StepPage>
  );
}
