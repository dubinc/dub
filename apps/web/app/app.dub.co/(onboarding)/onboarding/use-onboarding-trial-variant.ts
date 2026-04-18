import { useSyncedLocalStorage } from "@/lib/hooks/use-synced-local-storage";

export function useOnboardingTrialVariant() {
  const [trialVariant, setTrialVariant] = useSyncedLocalStorage<
    "control" | "trial" | undefined
  >("dub_trial_d1d6f8671832d7a30e805a7fa01f968b", undefined);

  if (trialVariant === undefined) {
    setTrialVariant(Math.random() > 0.5 ? "trial" : "control");
  }

  return {
    isTrialVariant: trialVariant === "trial",
  };
}
