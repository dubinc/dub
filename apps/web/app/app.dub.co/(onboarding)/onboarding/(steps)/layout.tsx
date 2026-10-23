import { AuroraGradient } from "@/ui/shared/aurora-gradient";
import { Grid, Wordmark } from "@dub/ui";
import { cn } from "@dub/utils";
import { SignedInHint } from "app/app.dub.co/(onboarding)/signed-in-hint";
import Link from "next/link";
import { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <>
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

      <div className="relative flex min-h-[100dvh] w-full flex-col items-center overflow-hidden md:justify-between">
        <div className="w-full px-4 pt-4 md:grow md:basis-0 md:px-0">
          <div className="flex justify-center pt-4">
            <Link href="https://dub.co/home" target="_blank" className="block">
              <Wordmark className="h-8" />
            </Link>
          </div>
        </div>

        <div className="w-full flex-1 overflow-y-auto md:flex-none md:overflow-visible">
          <div className="w-full px-5 pb-8 pt-8 md:py-16 lg:px-0">
            {children}
          </div>
        </div>

        <div className="w-full md:hidden">
          <SignedInHint />
        </div>

        {/* Empty div to center main content on desktop */}
        <div className="hidden md:block md:grow md:basis-0" />
      </div>
    </>
  );
}
