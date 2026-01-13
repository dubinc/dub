"use client";

import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramOnboardingFormWrapper } from "@/ui/partners/program-onboarding-form-wrapper";
import { cn } from "@dub/utils/src";
import { useMemo } from "react";
import { useOnboardingProgress } from "../../use-onboarding-progress";
import { StepPage } from "../step-page";
import { Form } from "./form";

export default function Program() {
  const { slug, name, logo } = useWorkspace();
  const { allWorkspaceDomains, loading: loadingDomains } = useDomains();

  const { continueTo } = useOnboardingProgress();

  const domain = useMemo(
    () =>
      allWorkspaceDomains.length
        ? allWorkspaceDomains.sort(
            (a, b) =>
              // Most recent first
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )[0]
        : null,
    [allWorkspaceDomains],
  );

  if (!loadingDomains && !domain) continueTo("domain");

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
        inert={slug === undefined || !domain}
      >
        <ProgramOnboardingFormWrapper
          defaultValues={{
            name: name ?? undefined,
            logo: logo ?? undefined,
            domain: domain?.slug,
          }}
          key={slug === undefined || !domain ? "loading" : "loaded"}
        >
          <Form />
        </ProgramOnboardingFormWrapper>
      </div>
    </StepPage>
  );
}
