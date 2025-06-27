import { cn } from "@dub/utils";
import { ReactNode } from "react";

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
