"use client";

import { OnboardingStep } from "@/lib/onboarding/types";
import { LoadingSpinner } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { PropsWithChildren } from "react";
import { useOnboardingProgress } from "./use-onboarding-progress";

export function LaterButton({
  next,
  className,
  children,
  "data-testid": dataTestId,
}: PropsWithChildren<{
  next: OnboardingStep;
  className?: string;
  "data-testid"?: string;
}>) {
  const { continueTo, isLoading, isSuccessful } = useOnboardingProgress();

  return (
    <button
      type="button"
      data-testid={dataTestId}
      onClick={() => continueTo(next)}
      className={cn(
        "mx-auto flex w-fit items-center gap-2 text-center text-sm font-medium text-neutral-800 transition-colors enabled:hover:text-neutral-950",
        className,
      )}
      disabled={isLoading || isSuccessful}
    >
      <LoadingSpinner
        className={cn(
          "size-3 transition-opacity",
          !(isLoading || isSuccessful) && "opacity-0",
        )}
      />
      {children || "I'll do this later"}
      <div className="w-3" />
    </button>
  );
}
