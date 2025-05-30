import { ProgramWithLanderDataProps } from "@/lib/types";
import { Button, useScroll, Wordmark } from "@dub/ui";
import { cn, PARTNERS_DOMAIN } from "@dub/utils";
import { CSSProperties, useRef } from "react";
import { useWatch } from "react-hook-form";
import { LanderRewards } from "../../lander/lander-rewards";
import { ProgramApplicationForm } from "../../lander/program-application-form";
import { useBrandingFormContext } from "../branding-form";
import { PreviewWindow } from "../preview-window";

// Currently unused, but will be needed when we add form customization
export function ApplicationPreview({
  program,
}: {
  program: ProgramWithLanderDataProps;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolled = useScroll(0, { container: scrollRef });

  const { setValue, getValues } = useBrandingFormContext();
  const { landerData, brandColor, logo, wordmark } = {
    ...useWatch(),
    ...getValues(),
  };

  return (
    <PreviewWindow
      url={`${PARTNERS_DOMAIN}/${program?.slug}/apply`}
      scrollRef={scrollRef}
    >
      <div className="relative z-0 mx-auto min-h-screen w-full bg-white">
        <div
          style={
            {
              "--brand": brandColor || "#000000",
              "--brand-ring": "rgb(from var(--brand) r g b / 0.2)",
            } as CSSProperties
          }
        >
          <header className={"sticky top-0 z-10 bg-white/90 backdrop-blur-sm"}>
            <div className="mx-auto flex max-w-screen-sm items-center justify-between px-6 py-4">
              {/* Bottom border when scrolled */}
              <div
                className={cn(
                  "absolute inset-x-0 bottom-0 h-px bg-neutral-200 opacity-0 transition-opacity duration-300 [mask-image:linear-gradient(90deg,transparent,black,transparent)]",
                  scrolled && "opacity-100",
                )}
              />

              <div className="animate-fade-in my-0.5 block">
                {wordmark || logo ? (
                  <img
                    className="max-h-7 max-w-32"
                    src={(wordmark ?? logo) as string}
                  />
                ) : (
                  <Wordmark className="h-7" />
                )}
              </div>

              <div className="flex items-center gap-2" {...{ inert: "" }}>
                <Button
                  type="button"
                  variant="secondary"
                  text="Log in"
                  className="animate-fade-in h-8 w-fit text-neutral-600"
                />
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-screen-sm">
            <div className="px-6">
              <div className="grid grid-cols-1 gap-5 sm:pt-20">
                <p className="font-mono text-xs font-medium uppercase text-[var(--brand)]">
                  Affiliate Program
                </p>
                <h1 className="text-4xl font-semibold">
                  {program.name} application
                </h1>
                <p className="text-base text-neutral-700">
                  Submit your application to join the affiliate program.
                </p>
              </div>
            </div>
          </div>
          <div className="mx-auto mt-6 max-w-screen-sm">
            <div className="px-6">
              {/* Program details grid */}
              <LanderRewards
                program={{
                  rewards: program.rewards ?? [],
                  defaultDiscount:
                    program.discounts?.find(
                      (d) => d.id === program.defaultDiscountId,
                    ) || null,
                }}
              />
            </div>
          </div>

          <div className="mx-auto my-10 max-w-screen-sm" {...{ inert: "" }}>
            <div className="px-6">
              <ProgramApplicationForm program={program} preview />
            </div>
          </div>
        </div>
      </div>
    </PreviewWindow>
  );
}
