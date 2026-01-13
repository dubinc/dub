"use client";

import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import { useMemo } from "react";
import { useOnboardingProgress } from "../../use-onboarding-progress";

export function useOnboardingProgram() {
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

  return {
    isLoading: slug === undefined || !domain,
    formWrapperProps: {
      defaultValues: {
        name: name ?? undefined,
        logo: logo ?? undefined,
        domain: domain?.slug,
        maxDuration: 0,
      },
    },
  };
}
