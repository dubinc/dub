import { ProgressCircle } from "@dub/ui";
import { cn } from "@dub/utils";
import { ReactNode } from "react";

export function EmphasisNumber({ children }: { children: ReactNode }) {
  return (
    <span className="text-content-emphasis text-sm font-semibold">
      {children}
    </span>
  );
}

export type BountyProgressVariant = "bar" | "circle";

export function BountyProgressBarRow({
  progress,
  children,
  labelClassName,
  wrapperClassName,
  variant = "bar",
}: {
  progress: number;
  children: ReactNode;
  labelClassName?: string;
  wrapperClassName?: string;
  // the compact list view shows a circle before the label instead of a bar above it
  variant?: BountyProgressVariant;
}) {
  const percent = Math.min(Math.max(progress, 0), 100);
  const isComplete = percent >= 100;

  const label = (
    <p
      className={cn("text-content-subtle text-xs font-medium", labelClassName)}
    >
      {children}
    </p>
  );

  if (variant === "circle") {
    return (
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center",
          wrapperClassName ?? "gap-1.5",
        )}
      >
        <ProgressCircle progress={percent / 100} />
        {label}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col",
        wrapperClassName ?? "gap-2",
      )}
    >
      <div className="bg-bg-emphasis h-1 w-full overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full",
            isComplete ? "bg-green-600" : "bg-amber-600",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {label}
    </div>
  );
}
