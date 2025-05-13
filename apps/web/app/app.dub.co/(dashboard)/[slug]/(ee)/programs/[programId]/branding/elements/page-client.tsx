"use client";

import { updateProgramAction } from "@/lib/actions/partners/update-program";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  ProgramLanderData,
  ProgramProps,
  ProgramWithLanderDataProps,
} from "@/lib/types";
import {
  programLanderBlockSchema,
  programLanderSchema,
} from "@/lib/zod/schemas/program-lander";
import { PreviewWindow } from "@/ui/partners/design/preview-window";
import { BLOCK_COMPONENTS } from "@/ui/partners/lander-blocks";
import { LanderHero } from "@/ui/partners/lander-hero";
import { LanderRewards } from "@/ui/partners/lander-rewards";
import {
  Brush,
  Button,
  Grid,
  Pen2,
  Plus2,
  Tooltip,
  Trash,
  useScroll,
  Wordmark,
} from "@dub/ui";
import { cn, PARTNERS_DOMAIN } from "@dub/utils";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import {
  CSSProperties,
  PropsWithChildren,
  useCallback,
  useRef,
  useState,
} from "react";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { z } from "zod";
import { BrandingSettingsForm } from "./branding-settings-form";

type FormData = {
  landerData: z.infer<typeof programLanderSchema>;
} & Pick<ProgramProps, "logo" | "wordmark" | "brandColor">;

export function useProgramBrandingForm() {
  return useFormContext<FormData>();
}

export function ProgramBrandingLandingPageClient() {
  const { id: workspaceId } = useWorkspace();
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

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = form;

  const { executeAsync } = useAction(updateProgramAction, {
    async onSuccess() {
      toast.success("Program updated successfully.");
      mutate(`/api/programs/${program?.id}?workspaceId=${workspaceId}`);
    },
    onError({ error }) {
      console.error(error);
      toast.error("Failed to update program.");
    },
  });

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        await executeAsync({
          workspaceId: workspaceId!,
          programId: program!.id,
          ...data,
        });

        // Reset isDirty state
        reset(data);
      })}
      className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
    >
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
              type="submit"
              variant="primary"
              text="Publish"
              loading={isSubmitting}
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

  const { control, setValue } = useProgramBrandingForm();
  const [landerData, brandColor, logo, wordmark] = useWatch({
    control,
    name: ["landerData", "brandColor", "logo", "wordmark"],
  });

  const updateBlocks = useCallback(
    (
      fn: (blocks: ProgramLanderData["blocks"]) => ProgramLanderData["blocks"],
    ) => {
      return setValue(
        "landerData",
        {
          ...landerData,
          blocks: fn(landerData.blocks),
        },
        {
          shouldDirty: true,
        },
      );
    },
    [landerData],
  );

  return (
    <PreviewWindow
      url={`${PARTNERS_DOMAIN}/${program?.slug}`}
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
                <Button
                  type="button"
                  text="Apply"
                  className="animate-fade-in h-8 w-fit border-[var(--brand)] bg-[var(--brand)] hover:bg-[var(--brand)] hover:ring-[var(--brand-ring)]"
                />
              </div>
            </div>
          </header>
          <div className="mx-auto mt-6 max-w-screen-sm">
            <div className="px-6">
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
                {...{ inert: "" }}
              >
                <Button
                  type="button"
                  text="Apply today"
                  className="border-[var(--brand)] bg-[var(--brand)] hover:bg-[var(--brand)] hover:ring-[var(--brand-ring)]"
                />
              </div>
            </div>
          </div>

          {/* Content blocks */}
          <div className="relative z-0 mt-6 grid grid-cols-1">
            {landerData?.blocks.map((block, idx) => {
              const Component = BLOCK_COMPONENTS[block.type];
              return Component ? (
                <div key={block.id} className="group relative py-10">
                  <EditIndicatorGrid />

                  {/* Edit toolbar */}
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <div className="absolute right-6 top-2">
                      <EditToolbar
                        block={block}
                        isFirst={idx === 0}
                        isLast={idx === landerData.blocks.length - 1}
                        onMoveUp={() =>
                          updateBlocks((blocks) =>
                            moveItem(blocks, idx, idx - 1),
                          )
                        }
                        onMoveDown={() =>
                          updateBlocks((blocks) =>
                            moveItem(blocks, idx, idx + 1),
                          )
                        }
                        onDelete={() =>
                          updateBlocks((blocks) => blocks.toSpliced(idx, 1))
                        }
                      />
                    </div>
                  </div>

                  {/* Insert block button */}
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 opacity-0",
                      "transition-opacity duration-150 group-hover:opacity-100 group-has-[+div:hover]:opacity-100",
                    )}
                  >
                    <div className="absolute inset-x-0 top-0 z-10 hidden group-first:block">
                      <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <InsertBlockButton />
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 z-10">
                      <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <InsertBlockButton />
                      </div>
                    </div>
                  </div>

                  <div
                    className="relative mx-auto max-w-screen-sm"
                    {...{ inert: "" }}
                  >
                    <div className="px-6">
                      <Component block={block} logo={program.logo} preview />
                    </div>
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </div>
      </div>
    </PreviewWindow>
  );
}

function InsertBlockButton() {
  return (
    <Button
      type="button"
      text="Insert block"
      onClick={() => toast.info("WIP")}
      icon={<Plus2 className="size-2.5" />}
      variant="secondary"
      className="h-6 w-fit gap-1 px-2.5 text-xs"
    />
  );
}

function EditIndicatorGrid() {
  return (
    <div className="border-subtle pointer-events-none absolute inset-y-0 left-1/2 w-[1080px] max-w-[calc(100cqw-32px)] -translate-x-1/2 overflow-hidden rounded-xl border opacity-0 transition-opacity duration-150 group-hover:opacity-100">
      <Grid
        cellSize={60}
        className="text-border-subtle inset-[unset] left-1/2 top-1/2 h-[max(1200px,100%)] w-[1200px] -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}

function EditToolbar({
  block,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  block: z.infer<typeof programLanderBlockSchema>;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center rounded-md border border-neutral-200 bg-white p-0.5 shadow-sm">
      <EditToolbarTooltip content="Edit">
        <Button
          type="button"
          variant="outline"
          icon={<Pen2 className="size-4" />}
          className="size-7 p-0"
          onClick={() => toast.info("WIP")}
        />
      </EditToolbarTooltip>
      {!isFirst && (
        <EditToolbarTooltip content="Move up">
          <Button
            type="button"
            variant="outline"
            icon={<ArrowUp className="size-4" />}
            className="size-7 p-0"
            onClick={onMoveUp}
          />
        </EditToolbarTooltip>
      )}
      {!isLast && (
        <EditToolbarTooltip content="Move down">
          <Button
            type="button"
            variant="outline"
            icon={<ArrowDown className="size-4" />}
            className="size-7 p-0"
            onClick={onMoveDown}
          />
        </EditToolbarTooltip>
      )}
      <EditToolbarTooltip content="Delete">
        <Button
          type="button"
          variant="outline"
          icon={<Trash className="size-4" />}
          className="size-7 p-0"
          onClick={onDelete}
        />
      </EditToolbarTooltip>
    </div>
  );
}

function EditToolbarTooltip({
  content,
  children,
}: PropsWithChildren<{ content: string }>) {
  return (
    <Tooltip
      content={
        <div className="px-2 py-1 text-xs text-neutral-600">{content}</div>
      }
    >
      <div>{children}</div>
    </Tooltip>
  );
}

const moveItem = <T extends any>(array: T[], from: number, to: number) => {
  const newArray = array.slice();
  newArray.splice(to, 0, newArray.splice(from, 1)[0]);
  return newArray;
};
