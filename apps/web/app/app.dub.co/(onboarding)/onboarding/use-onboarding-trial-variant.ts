import { useLocalStorage } from "@dub/ui";

export function useOnboardingTrialVariant() {
  const [isTrialVariant] = useLocalStorage(
    "dub_trial_d1d6f8671832d7a30e805a7fa01f968b",
    Math.random() > 0.5 ? true : false,
  );

  return {
    isTrialVariant,
  };
}
