import useWorkspace from "@/lib/swr/use-workspace";
import { useRouter } from "next/navigation";

export function useOnboardingProgress() {
  const router = useRouter();

  const { slug } = useWorkspace();

  return {
    continue: (step: string) => router.push(`/onboarding/${step}?slug=${slug}`),
  };
}
