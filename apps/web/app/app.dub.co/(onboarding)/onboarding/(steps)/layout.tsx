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

      <div className="relative flex min-h-[100dvh] min-h-screen w-full flex-col items-center overflow-hidden md:justify-between">
        <div className="w-full px-4 pt-4 md:grow md:basis-0 md:px-0">
          <div className="flex justify-center pt-4">
            <Link href="https://dub.co/home" target="_blank" className="block">
              <Wordmark className="h-8" />
            </Link>
          </div>
        </div>

        <div className="w-full flex-1 overflow-y-auto md:flex-none md:overflow-visible">
          <div className="w-full px-5 pb-8 pt-8 sm:pb-4 md:px-0 md:py-16">
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
