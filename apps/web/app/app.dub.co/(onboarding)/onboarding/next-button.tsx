"use client";

import { OnboardingStep } from "@/lib/onboarding/types";
import { Button, ButtonProps } from "@dub/ui";
import { useOnboardingProgress } from "./use-onboarding-progress";

export function NextButton({
  step,
  ...rest
}: { step: OnboardingStep } & ButtonProps) {
  const { continueTo, isLoading, isSuccessful } = useOnboardingProgress();

  return (
    <Button
      variant="primary"
      text="Next"
      onClick={() => continueTo(step)}
      loading={isLoading || isSuccessful}
      {...rest}
    />
  );
}
