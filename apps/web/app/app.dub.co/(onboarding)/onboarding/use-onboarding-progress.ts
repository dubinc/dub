import { setOnboardingProgress } from "@/lib/actions/set-onboarding-progress";
import { OnboardingStep } from "@/lib/onboarding/types";
import useWorkspace from "@/lib/swr/use-workspace";
import { useAction } from "next-safe-action/hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";
import { useOnboardingProduct } from "./use-onboarding-product";

const PRE_WORKSPACE_STEPS = ["workspace"];

export function useOnboardingProgress() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { slug: workspaceSlug } = useWorkspace();
  const slug = workspaceSlug || searchParams.get("workspace");
  const product = useOnboardingProduct();

  const { execute, executeAsync, isPending, hasSucceeded } = useAction(
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
      {
        slug: providedSlug,
        params,
      }: { slug?: string; params?: Record<string, string> } = {},
    ) => {
      execute({
        onboardingStep: step,
      });

      const queryParams = new URLSearchParams({
        ...(product && ["links", "partners"].includes(product)
          ? { product }
          : {}),
        ...(params || {}),
        ...(PRE_WORKSPACE_STEPS.includes(step)
          ? {}
          : { workspace: (providedSlug || slug)! }),
      });

      router.push(`/onboarding/${step}?${queryParams}`);
    },
    [execute, router, slug, product],
  );

  const finish = useCallback(
    async ({ hasProgram }: { hasProgram?: boolean } = {}) => {
      await executeAsync({
        onboardingStep: "completed",
      });

      router.push(slug ? (hasProgram ? `/${slug}/program` : `/${slug}`) : "/");
    },
    [executeAsync, router, slug],
  );

  return {
    continueTo,
    finish,
    isLoading: isPending,
    isSuccessful: hasSucceeded,
  };
}
