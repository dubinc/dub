import { useSyncedLocalStorage } from "@/lib/hooks/use-synced-local-storage";
import { useEffect } from "react";

export function useOnboardingTrialVariant() {
  const [trialVariant, setTrialVariant] = useSyncedLocalStorage<
    "control" | "trial_d1d6f8671832d7a30e805a7fa01f968b" | undefined
  >("dub_onboarding_trial_variant", undefined);

  useEffect(() => {
    if (trialVariant !== undefined) return;
    setTrialVariant(
      Math.random() > 0.5
        ? "trial_d1d6f8671832d7a30e805a7fa01f968b"
        : "control",
    );
  }, [trialVariant]);

  return {
    isTrialVariant: trialVariant === "trial_d1d6f8671832d7a30e805a7fa01f968b",
  };
}
