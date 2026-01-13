"use client";

import { ProgramOnboardingFormWrapper } from "@/ui/partners/program-onboarding-form-wrapper";
import { cn } from "@dub/utils/src";
import { StepPage } from "../step-page";
import { Form } from "./form";
import { useOnboardingProgram } from "./use-onboarding-program";

export default function Program() {
  const { isLoading, formWrapperProps } = useOnboardingProgram();

  return (
    <StepPage
      title="Create your partner program"
      description="Set up your program in a few steps"
    >
      <div
        className={cn(
          "transition-opacity",
          isLoading && "pointer-events-none opacity-50",
        )}
        inert={isLoading}
      >
        <ProgramOnboardingFormWrapper
          key={isLoading ? "loading" : "loaded"}
          {...formWrapperProps}
        >
          <Form />
        </ProgramOnboardingFormWrapper>
      </div>
    </StepPage>
  );
}
