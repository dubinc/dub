"use client";

import useWorkspace from "@/lib/swr/use-workspace";

export function useOnboardingProgram({ domain }: { domain?: string } = {}) {
  const { slug, name, logo } = useWorkspace();

  return {
    isLoading: slug === undefined,
    formWrapperProps: {
      defaultValues: {
        name: name ?? undefined,
        logo: logo ?? undefined,
        domain,
        maxDuration: 0,
      },
    },
  };
}
