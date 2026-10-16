import { cn } from "@dub/utils";
import Link from "next/link";
import { ComponentProps } from "react";

export function ProgramOverviewRow({
  className,
  ...rest
}: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "text-content-default hover:bg-bg-subtle focus-visible:bg-bg-subtle relative flex h-[42px] shrink-0 items-center justify-between gap-3 rounded-lg px-2 text-xs font-medium transition-colors",
        // Inset divider sits in the 1px gap above the row, so the hover fill never covers it
        "before:bg-neutral-150 mt-px before:absolute before:inset-x-2 before:-top-px before:h-px first:mt-0 first:before:hidden",
        className,
      )}
      {...rest}
    />
  );
}
