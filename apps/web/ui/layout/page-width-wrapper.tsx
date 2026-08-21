import { cn } from "@dub/utils";
import { ReactNode } from "react";

/**
 * Standard page container for app + partners dashboard pages. Registers the
 * `@container/page` container query scope, so children can use `@md/page:`
 * variants to respond to content width rather than viewport width.
 * App-local only — not exported from `@dub/ui`; marketing surfaces use
 * `MaxWidthWrapper` instead.
 */
export function PageWidthWrapper({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "@container/page mx-auto w-full max-w-screen-xl px-3 lg:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
