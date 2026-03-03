import { cn } from "@dub/utils";
import { ReactNode } from "react";

export function EmphasisNumber({ children }: { children: ReactNode }) {
  return (
    <span className="text-content-emphasis font-semibold">{children}</span>
  );
}

export function BountyProgressBarRow({
  progress,
  children,
}: {
  progress: number;
  children: ReactNode;
}) {
  const percent = Math.min(Math.max(progress, 0), 100);
  const isComplete = percent >= 100;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200">
        <div
          className={cn(
            "h-full rounded-full",
            isComplete ? "bg-green-600" : "bg-amber-600",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-content-subtle text-xs font-medium">{children}</p>
    </div>
  );
}
