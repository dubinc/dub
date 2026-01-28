import Toolbar from "@/ui/layout/toolbar/toolbar";
import { Grid, Wordmark } from "@dub/ui";
import { cn } from "@dub/utils";
import { ReactNode } from "react";
import { SidePanel } from "./side-panel";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Toolbar />

      <div className="relative grid h-screen grid-cols-1 min-[900px]:grid-cols-[minmax(0,1fr)_440px] lg:grid-cols-[minmax(0,1fr)_595px]">
        {/* Left: Main auth content */}
        <div className="relative">
          <div className="absolute inset-0 isolate overflow-hidden bg-white">
            {/* Grid */}
            <div
              className={cn(
                "absolute inset-y-0 left-1/2 w-[1200px] -translate-x-1/2",
                "[mask-composite:intersect] [mask-image:linear-gradient(black,transparent_320px),linear-gradient(90deg,transparent,black_5%,black_95%,transparent)]",
              )}
            >
              <Grid
                cellSize={60}
                patternOffset={[0.75, 0]}
                className="text-neutral-200"
              />
            </div>

            {/* Gradient */}
            {[...Array(2)].map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "absolute left-1/2 top-6 size-[80px] -translate-x-1/2 -translate-y-1/2 scale-x-[1.6]",
                  idx === 0 ? "mix-blend-overlay" : "opacity-10",
                )}
              >
                {[...Array(idx === 0 ? 2 : 1)].map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "absolute -inset-16 mix-blend-overlay blur-[50px] saturate-[2]",
                      "bg-[conic-gradient(from_90deg,#F00_5deg,#EAB308_63deg,#5CFF80_115deg,#1E00FF_170deg,#855AFC_220deg,#3A8BFD_286deg,#F00_360deg)]",
                    )}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="relative flex min-h-screen w-full justify-center">
            <a
              href="https://dub.co"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute left-1/2 top-4 z-10 -translate-x-1/2"
            >
              <Wordmark className="h-8" />
            </a>
            {children}
          </div>
        </div>

        {/* Right: Side panel - hidden on mobile */}
        <SidePanel />
      </div>
    </>
  );
}
