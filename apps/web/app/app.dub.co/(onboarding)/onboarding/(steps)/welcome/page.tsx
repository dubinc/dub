import { testIds } from "@/lib/e2e/test-ids";
import { StepPage } from "../step-page";
import { AccountTypeSelector } from "./account-type-selector";
import TrackSignup from "./track-signup";

export default function Welcome() {
  return (
    <>
      <TrackSignup />
      <StepPage
        headingTestId={testIds.onboarding.stepWelcome}
        title="Welcome to Dub"
        description="Tell us what brings you here, and we’ll help you get started."
        className="max-w-[640px]"
      >
        <AccountTypeSelector />
      </StepPage>
    </>
  );
}
