"use client";

import { OnboardingStep } from "@/lib/onboarding/types";
import { Button, ButtonProps } from "@dub/ui";
import { usePlausible } from "next-plausible";
import { useOnboardingProgress } from "./use-onboarding-progress";
import { useOnboardingTrialVariant } from "./use-onboarding-trial-variant";

export function NextButton({
  step,
  ...rest
}: { step: OnboardingStep } & ButtonProps) {
  const plausible = usePlausible();
  const { continueTo, isLoading, isSuccessful } = useOnboardingProgress();
  const { isTrialVariant } = useOnboardingTrialVariant();

  return (
    <Button
      variant="primary"
      text="Next"
      onClick={() => {
        // track onboarding started event if continuing to workspace step
        if (step === "workspace") {
          plausible(
            `Started Onboarding (${isTrialVariant ? "Trial" : "No Trial"})`,
          );
        }
        continueTo(step);
      }}
      loading={isLoading || isSuccessful}
      {...rest}
    />
  );
}
