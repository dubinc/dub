"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramOnboardingFormWrapper } from "@/ui/partners/program-onboarding-form-wrapper";
import { cn } from "@dub/utils/src";
import { StepPage } from "../step-page";
import { Form } from "./form";

export default function Program() {
  const { slug, name, logo } = useWorkspace();

  return (
    <StepPage
      title="Create your partner program"
      description="Set up your program in a few steps"
    >
      <div
        className={cn(
          "transition-opacity",
          slug === undefined && "pointer-events-none opacity-50",
        )}
        inert={slug === undefined}
      >
        <ProgramOnboardingFormWrapper
          defaultValues={{ name: name ?? undefined, logo: logo ?? undefined }}
          key={slug === undefined ? "loading" : "loaded"}
        >
          <Form />
        </ProgramOnboardingFormWrapper>
      </div>
    </StepPage>
  );
}
