"use client";

import { ProgramOnboardingFormWrapper } from "@/ui/partners/program-onboarding-form-wrapper";
import { cn } from "@dub/utils";
import { StepPage } from "../../step-page";
import { useOnboardingProgram } from "../use-onboarding-program";
import { Form } from "./form";

export default function ProgramReward() {
  const { isLoading, formWrapperProps } = useOnboardingProgram();

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
