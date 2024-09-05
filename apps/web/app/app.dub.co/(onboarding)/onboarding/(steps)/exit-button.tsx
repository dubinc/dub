"use client";

import { ExpandingArrow, LoadingSpinner } from "@dub/ui/src/icons";
import { useOnboardingProgress } from "../use-onboarding-progress";

export function ExitButton() {
  const { finish, isLoading, isSuccessful } = useOnboardingProgress();

  return (
    <button
      type="button"
      onClick={finish}
      disabled={isLoading || isSuccessful}
      className="group flex items-center gap-1 p-3 pr-7 text-sm text-black/50 transition-colors enabled:hover:text-black/80"
    >
      {(isLoading || isSuccessful) && (
        <LoadingSpinner className="mr-1 size-3" />
      )}
      Skip onboarding
      <ExpandingArrow className="size-3" />
    </button>
  );
}
