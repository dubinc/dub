import { testIds } from "@/lib/e2e/test-ids";
import { NextButton } from "../../next-button";
import { StepPage } from "../step-page";
import TrackSignup from "./track-signup";

export default function Welcome() {
  return (
    <>
      <TrackSignup />
      <StepPage
        headingTestId={testIds.onboarding.stepWelcome}
        title="Welcome to Dub"
        description="Create short links, track clicks and conversions, and grow your business with Dub."
        className="max-w-sm"
      >
        <NextButton
          step="workspace"
          text="Get started"
          className="h-9 rounded-lg"
          data-testid={testIds.onboarding.getStarted}
        />
      </StepPage>
    </>
  );
}
