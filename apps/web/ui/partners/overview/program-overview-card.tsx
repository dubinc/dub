import { cn } from "@dub/utils";
import { PropsWithChildren } from "react";

export function ProgramOverviewCard({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "border-border-subtle rounded-[0.625rem] border bg-white",
        className,
      )}
    >
      {children}
    </div>
  );
}
