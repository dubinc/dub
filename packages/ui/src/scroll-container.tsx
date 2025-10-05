import { cn } from "@dub/utils";
import { PropsWithChildren, useRef } from "react";
import { useScrollProgress } from "./hooks/use-scroll-progress";

export function ScrollContainer({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollProgress, updateScrollProgress } = useScrollProgress(ref);

  return (
    <div className="relative">
      <div
        className={cn(
          "scrollbar-hide h-[190px] w-screen overflow-y-scroll sm:w-auto",
          className,
        )}
        ref={ref}
        onScroll={updateScrollProgress}
      >
        {children}
      </div>
      {/* Bottom scroll fade */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 hidden h-8 w-full rounded-b-lg bg-gradient-to-t from-white sm:block"
        style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
      />
    </div>
  );
}
