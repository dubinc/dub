import Toolbar from "@/ui/layout/toolbar/toolbar";
import { AuroraGradient } from "@/ui/shared/aurora-gradient";
import { Grid, Wordmark } from "@dub/ui";
import { cn } from "@dub/utils";
import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Toolbar />

      <div className="relative min-h-[100dvh]">
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

          <AuroraGradient />
        </div>

        <div className="relative flex min-h-[100dvh] min-h-screen w-full justify-center">
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
    </>
  );
}
