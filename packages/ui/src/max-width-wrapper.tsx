import { cn } from "@dub/utils";
import { ReactNode } from "react";

/**
 * Legacy shared container (`@dub/ui`), used by marketing nav/footer and
 * older dashboard pages. For app/partners dashboard pages, use
 * `PageWidthWrapper` (`apps/web/ui/layout/page-width-wrapper.tsx`) instead.
 */
export function MaxWidthWrapper({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("mx-auto w-full max-w-screen-xl px-3 lg:px-10", className)}
    >
      {children}
    </div>
  );
}
