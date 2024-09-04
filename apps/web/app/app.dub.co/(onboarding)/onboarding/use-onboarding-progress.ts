import { setOnboardingProgress } from "@/lib/actions/set-onboarding-progress";
import { OnboardingStep } from "@/lib/onboarding/types";
import useWorkspace from "@/lib/swr/use-workspace";
import { useAction } from "next-safe-action/hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";

const PRE_WORKSPACE_STEPS = ["workspace"];

export function useOnboardingProgress() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { slug: workspaceSlug } = useWorkspace();
  const slug = workspaceSlug || searchParams.get("workspace");

  const { execute, executeAsync, isExecuting, hasSucceeded } = useAction(
    setOnboardingProgress,
    {
      onSuccess: () => {
        console.log("Onboarding progress updated");
      },
      onError: ({ error }) => {
        toast.error("Failed to update onboarding progress. Please try again.");
        console.error("Failed to update onboarding progress", error);
      },
    },
  );

  const continueTo = useCallback(
    async (
      step: OnboardingStep,
      { slug: providedSlug }: { slug?: string } = {},
    ) => {
      execute({
        onboardingStep: step,
      });

      const queryParams = PRE_WORKSPACE_STEPS.includes(step)
        ? ""
        : `?workspace=${providedSlug || slug}`;
      router.push(`/onboarding/${step}${queryParams}`);
    },
    [execute, router, slug],
  );

  const finish = useCallback(async () => {
    await executeAsync({
      onboardingStep: "completed",
    });

    router.push(`/${slug}?onboarded=true`);
  }, [execute, router, slug]);

  return {
    continueTo,
    finish,
    isLoading: isExecuting,
    isSuccessful: hasSucceeded,
  };
}
