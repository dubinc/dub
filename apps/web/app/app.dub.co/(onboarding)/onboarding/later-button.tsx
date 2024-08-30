import { OnboardingStep } from "@/lib/onboarding/types";
import { LoadingSpinner } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { PropsWithChildren } from "react";
import { useOnboardingProgress } from "./use-onboarding-progress";

export function LaterButton({
  next,
  className,
  children,
}: PropsWithChildren<{ next: OnboardingStep | "finish"; className?: string }>) {
  const { continueTo, finish, isLoading, isSuccessful } =
    useOnboardingProgress();

  return (
    <button
      type="button"
      onClick={() => (next === "finish" ? finish() : continueTo(next))}
      className={cn(
        "mx-auto flex w-fit items-center gap-2 text-center text-sm text-gray-500 transition-colors enabled:hover:text-gray-700",
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
