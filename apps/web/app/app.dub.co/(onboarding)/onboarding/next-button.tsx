"use client";

import { Button, ButtonProps } from "@dub/ui";
import { useOnboardingProgress } from "./use-onboarding-progress";

export function NextButton({ step, ...rest }: { step: string } & ButtonProps) {
  const { continueTo } = useOnboardingProgress();

  return (
    <Button
      variant="primary"
      text="Next"
      onClick={() => continueTo(step)}
      {...rest}
    />
  );
}
