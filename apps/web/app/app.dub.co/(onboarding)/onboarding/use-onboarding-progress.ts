import useWorkspace from "@/lib/swr/use-workspace";
import { useRouter } from "next/navigation";

const PRE_SLUG_STEPS = ["workspace"];

export function useOnboardingProgress() {
  const router = useRouter();

  const { slug } = useWorkspace();

  return {
    continueTo: (step: string, { slug: slugParam }: { slug?: string } = {}) => {
      const queryParams = PRE_SLUG_STEPS.includes(step)
        ? ""
        : `?slug=${slugParam || slug}`;
      router.push(`/onboarding/${step}${queryParams}`);
    },
  };
}
