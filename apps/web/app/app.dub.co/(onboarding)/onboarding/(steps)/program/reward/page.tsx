import { NextButton } from "../../../next-button";
import { StepPage } from "../../step-page";

export default function ProgramReward() {
  return (
    <StepPage
      title="Create your default reward"
      description={
        <>
          The default reward offered to your partners.
          <br />
          You can change this at any time.
        </>
      }
    >
      <NextButton step="plan" />
    </StepPage>
  );
}
