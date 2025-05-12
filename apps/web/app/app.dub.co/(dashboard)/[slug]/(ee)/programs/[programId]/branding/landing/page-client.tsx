"use client";

import useProgram from "@/lib/swr/use-program";
import { ProgramProps, ProgramWithLanderDataProps } from "@/lib/types";
import { programLanderSchema } from "@/lib/zod/schemas/program-lander";
import { PreviewWindow } from "@/ui/partners/design/preview-window";
import { BLOCK_COMPONENTS } from "@/ui/partners/lander-blocks";
import { LanderHero } from "@/ui/partners/lander-hero";
import { LanderRewards } from "@/ui/partners/lander-rewards";
import { Brush, Button, useScroll, Wordmark } from "@dub/ui";
import { cn, PARTNERS_DOMAIN } from "@dub/utils";
import { CSSProperties, useRef, useState } from "react";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { z } from "zod";
import { BrandingSettingsForm } from "./branding-settings-form";

type FormData = {
  landerData: z.infer<typeof programLanderSchema>;
} & Pick<ProgramProps, "logo" | "wordmark" | "brandColor">;

export function useProgramBrandingForm() {
  return useFormContext<FormData>();
}

export function ProgramBrandingLandingPageClient() {
  const { program } = useProgram<ProgramWithLanderDataProps>({
    query: { includeLanderData: true },
  });

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

  const form = useForm<FormData>({
    values: {
      logo: program?.logo ?? null,
      wordmark: program?.wordmark ?? null,
      brandColor: program?.brandColor ?? null,
      landerData: program?.landerData ?? { blocks: [] },
    },
  });

  // const { executeAsync } = useAction(updateProgramAction, {
  //   async onSuccess() {
  //     toast.success("Program updated successfully.");
  //     mutate(`/api/programs/${program.id}?workspaceId=${workspaceId}`);
  //   },
  //   onError({ error }) {
  //     console.error(error);
  //     toast.error("Failed to update program.");
  //   },
  // });

  return (
    <form className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
      <FormProvider {...form}>
        <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
          <div className="grow basis-0">
            <Button
              type="button"
              onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
              data-state={isSidePanelOpen ? "open" : "closed"}
              variant="secondary"
              icon={<Brush className="size-4" />}
              className="hidden size-8 p-0 lg:flex"
            />
          </div>
          <span className="text-center text-xs font-medium text-neutral-500">
            Landing page
          </span>
          <div className="flex grow basis-0 justify-end">
            <Button
              type="button"
              onClick={() => alert("WIP")}
              variant="primary"
              text="Publish"
              className="h-8 w-fit"
            />
          </div>
        </div>
        <div
          className={cn(
            "grid h-[calc(100vh-240px)] grid-cols-1 transition-[grid-template-columns]",
            isSidePanelOpen
              ? "lg:grid-cols-[240px_minmax(0,1fr)]"
              : "lg:grid-cols-[0px_minmax(0,1fr)]",
          )}
        >
          <div className="h-full overflow-hidden">
            <div
              className={cn(
                "scrollbar-hide h-full overflow-y-auto border-neutral-200 p-5 transition-opacity max-lg:border-b lg:w-[240px] lg:border-r",
                !isSidePanelOpen && "opacity-0",
              )}
            >
              <BrandingSettingsForm />
            </div>
          </div>
          <div className="h-full overflow-hidden px-4 pt-4">
            {program && <LanderPreview program={program} />}
          </div>
        </div>
      </FormProvider>
    </form>
  );
}

function LanderPreview({ program }: { program: ProgramWithLanderDataProps }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolled = useScroll(0, { container: scrollRef });

  const landerData = program.landerData ?? { blocks: [] };

  const brandColor = useWatch({ name: "brandColor" });

  return (
    <PreviewWindow
      url={`${PARTNERS_DOMAIN}/${program?.slug}`}
      scrollRef={scrollRef}
    >
      <div className="relative z-0 mx-auto min-h-screen w-full max-w-screen-sm bg-white">
        <div className="pointer-events-none absolute left-0 top-0 h-screen w-full border-x border-neutral-200 [mask-image:linear-gradient(black,transparent)]" />
        <div
          style={
            {
              "--brand": brandColor || "#000000",
              "--brand-ring": "rgb(from var(--brand) r g b / 0.2)",
            } as CSSProperties
          }
        >
          <header
            className={
              "sticky top-0 z-10 mx-px flex items-center justify-between bg-white/90 px-6 py-4 backdrop-blur-sm"
            }
          >
            {/* Bottom border when scrolled */}
            <div
              className={cn(
                "absolute inset-x-0 bottom-0 h-px bg-neutral-200 opacity-0 transition-opacity duration-300 [mask-image:linear-gradient(90deg,transparent,black,transparent)]",
                scrolled && "opacity-100",
              )}
            />

            <div className="animate-fade-in my-0.5 block">
              {program.wordmark || program.logo ? (
                <img
                  className="max-h-7 max-w-32"
                  src={(program.wordmark ?? program.logo) as string}
                />
              ) : (
                <Wordmark className="h-7" />
              )}
            </div>

            <div className="flex items-center gap-2" {...{ inert: true }}>
              <Button
                type="button"
                variant="secondary"
                text="Log in"
                className="animate-fade-in h-8 w-fit text-neutral-600"
              />
              <Button
                type="button"
                text="Apply"
                className="animate-fade-in h-8 w-fit border-[var(--brand)] bg-[var(--brand)] hover:bg-[var(--brand)] hover:ring-[var(--brand-ring)]"
              />
            </div>
          </header>
          <div className="p-6">
            <LanderHero program={program} />

            {/* Program details grid */}
            <div className="mt-10">
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

            {/* Buttons */}
            <div
              className="animate-scale-in-fade mt-10 flex flex-col gap-2 [animation-delay:400ms] [animation-fill-mode:both]"
              {...{ inert: true }}
            >
              <Button
                type="button"
                text="Apply today"
                className="border-[var(--brand)] bg-[var(--brand)] hover:bg-[var(--brand)] hover:ring-[var(--brand-ring)]"
              />
            </div>

            {/* Content blocks */}
            <div className="mt-16 grid grid-cols-1 gap-10">
              {landerData.blocks.map((block, idx) => {
                const Component = BLOCK_COMPONENTS[block.type];
                return Component ? (
                  <Component
                    key={idx}
                    block={block}
                    logo={program.logo}
                    preview
                  />
                ) : null;
              })}
            </div>
          </div>
        </div>
      </div>
    </PreviewWindow>
  );
}
