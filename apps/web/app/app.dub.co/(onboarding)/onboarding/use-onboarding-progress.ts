import { setOnboardingProgress } from "@/lib/actions/set-onboarding-progress";
import { OnboardingStep } from "@/lib/onboarding/types";
import useWorkspace from "@/lib/swr/use-workspace";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";

const PRE_SLUG_STEPS = ["workspace"];

export function useOnboardingProgress() {
  const router = useRouter();
  const { slug } = useWorkspace();

  const { executeAsync, isExecuting, hasSucceeded } = useAction(
    setOnboardingProgress,
    {
      onSuccess: () => {
        console.log("Onboarding progress updated");
      },
      onError: ({ error }) => {
        toast.error("Failed to update onboarding progress. Please try again.");
        console.error("Failed to update onboarding progress", Error);
      },
    },
  );

  const continueTo = useCallback(
    async (
      step: OnboardingStep,
      { slug: slugParam }: { slug?: string } = {},
    ) => {
      const result = await executeAsync({
        onboardingStep: step,
      });

      if (result?.serverError) return;

      const queryParams = PRE_SLUG_STEPS.includes(step)
        ? ""
        : `?slug=${slugParam || slug}`;
      router.push(`/onboarding/${step}${queryParams}`);
    },
    [executeAsync, router, slug],
  );

  const finish = useCallback(async () => {
    const result = await executeAsync({
      onboardingStep: null,
    });

    if (result?.serverError) return;

    router.push(`/${slug}?onboarded=true`);
  }, [executeAsync, router, slug]);

  return {
    continueTo,
    finish,
    isLoading: isExecuting,
    isSuccessful: hasSucceeded,
  };
}
