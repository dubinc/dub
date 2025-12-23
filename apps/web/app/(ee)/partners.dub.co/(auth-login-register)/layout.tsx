import { DubPartnersLogo } from "@/ui/dub-partners-logo";
import { Grid } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { Logo } from "../(auth-other)/logo";
import { ProgramLogos } from "./program-logos";

export default function PartnerAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative grid grid-cols-1 min-[900px]:grid-cols-[440px_minmax(0,1fr)] lg:grid-cols-[595px_minmax(0,1fr)]">
      <div className="hidden h-full flex-col items-start justify-between gap-8 overflow-hidden border-r border-black/5 bg-neutral-50 min-[900px]:flex">
        <div className="grow basis-0 p-4 lg:p-10">
          <DubPartnersLogo className="w-fit" />
        </div>

        <div className="flex flex-col gap-6 px-4 lg:px-10">
          <p className="text-content-default max-w-[370px] text-pretty text-xl font-medium">
            Join thousands of others who have earned over $10,000,000 on Dub
            partnering with world-class companies.
          </p>
          <Link
            target="_blank"
            href="https://dub.co/partners"
            className="text-content-emphasis flex h-8 w-fit items-center rounded-lg bg-black/5 px-3 text-sm font-medium transition-[transform,background-color] duration-75 hover:bg-black/10 active:scale-[0.98]"
          >
            Read more
          </Link>
        </div>

        <div className="w-full grow basis-0">
          <ProgramLogos />
        </div>
      </div>

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
        <div className="relative flex h-screen w-full justify-center">
          <Logo className="min-[900px]:hidden" />
          {children}
        </div>
      </div>
    </div>
  );
}
