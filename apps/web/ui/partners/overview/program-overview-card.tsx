import { cn } from "@dub/utils";
import { PropsWithChildren } from "react";

export function ProgramOverviewCard({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "border-border-subtle rounded-xl border bg-white",
        className,
      )}
    >
      {children}
    </div>
  );
}
