"use client";

import useDiscounts from "@/lib/swr/use-discounts";
import useRewards from "@/lib/swr/use-rewards";
import { ProgramLanderData, ProgramWithLanderDataProps } from "@/lib/types";
import { useEditHeroModal } from "@/ui/partners/design/modals/edit-hero-modal";
import { PreviewWindow } from "@/ui/partners/design/preview-window";
import { BLOCK_COMPONENTS } from "@/ui/partners/lander/blocks";
import { LanderHero } from "@/ui/partners/lander/lander-hero";
import {
  Button,
  CircleInfo,
  Grid,
  LoadingSpinner,
  Pen2,
  Plus2,
  Tooltip,
  Trash,
  useMediaQuery,
  useScroll,
  Wordmark,
} from "@dub/ui";
import { cn, PARTNERS_DOMAIN } from "@dub/utils";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  CSSProperties,
  PropsWithChildren,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useWatch } from "react-hook-form";
import { useBrandingContext } from "../branding-context-provider";
import { useBrandingFormContext } from "../branding-form";
import { LanderAIBanner } from "../lander-ai-banner";
import { LanderPreviewControls } from "../lander-preview-controls";
import { AddBlockModal, DESIGNER_BLOCKS } from "../modals/add-block-modal";
import { useEditRewardsModal } from "../modals/edit-rewards-modal";
import { RewardsDiscountsPreview } from "../rewards-discounts-preview";

export function LanderPreview({
  program,
}: {
  program: ProgramWithLanderDataProps;
}) {
  const { isMobile } = useMediaQuery();

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolled = useScroll(0, { container: scrollRef });

  const { isGeneratingLander } = useBrandingContext();

  const { rewards } = useRewards();
  const { discounts } = useDiscounts();

  const { setValue, getValues } = useBrandingFormContext();
  const { landerData, brandColor, logo, wordmark } = {
    ...useWatch(),
    ...getValues(),
  };

  const updateBlocks = useCallback(
    (
      fn: (blocks: ProgramLanderData["blocks"]) => ProgramLanderData["blocks"],
    ) => {
      return setValue(
        "landerData",
        {
          ...landerData,
          blocks: fn([...landerData.blocks]),
        },
        {
          shouldDirty: true,
        },
      );
    },
    [landerData],
  );

  const { setShowEditHeroModal, EditHeroModal } = useEditHeroModal();
  const { setShowEditRewardsModal, EditRewardsModal } = useEditRewardsModal();

  const [addBlockIndex, setAddBlockIndex] = useState<number | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const [editingBlock, editingBlockMeta] = useMemo(() => {
    if (!editingBlockId) return [null, null];

    const block = landerData.blocks.find(
      (block) => block.id === editingBlockId,
    );

    return [block, DESIGNER_BLOCKS.find((b) => b.id === block?.type)];
  }, [landerData, editingBlockId]);

  const [touchedBlockId, setTouchedBlockId] = useState<
    string | "hero" | "rewards" | null
  >(null);

  return (
    <>
      {editingBlock && editingBlockMeta && (
        <editingBlockMeta.modal
          defaultValues={editingBlock.data}
          showModal={true}
          setShowModal={(show) => !show && setEditingBlockId(null)}
          onSubmit={(data) => {
            updateBlocks((blocks) => {
              blocks[blocks.findIndex((b) => b.id === editingBlockId)].data =
                data;
              return blocks;
            });
            setTouchedBlockId(null);
          }}
        />
      )}
      <EditHeroModal />
      <EditRewardsModal />
      <AddBlockModal
        addIndex={addBlockIndex ?? 0}
        showAddBlockModal={addBlockIndex !== null}
        setShowAddBlockModal={(show) => {
          if (!show) {
            setAddBlockIndex(null);
            setTouchedBlockId(null);
          }
        }}
      />
      <LanderAIBanner />
      <PreviewWindow
        url={`${PARTNERS_DOMAIN}/${program?.slug}`}
        scrollRef={scrollRef}
        controls={<LanderPreviewControls />}
        overlay={
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-white/10",
              "pointer-events-none opacity-0 transition-[backdrop-filter,opacity] duration-500",
              isGeneratingLander &&
                "pointer-events-auto opacity-100 backdrop-blur-md",
            )}
            {...{ inert: isGeneratingLander ? undefined : "" }}
          >
            <div
              className={cn(
                "flex flex-col items-center gap-6 px-4 text-center text-sm transition-transform duration-500 sm:gap-2",
                !isGeneratingLander && "translate-y-1",
              )}
            >
              <div className="text-content-default flex items-center">
                <LoadingSpinner className="mr-2 size-3.5 shrink-0" />
                <span className="text-sm font-medium">Generating content</span>
                <span className="ml-px shrink-0">
                  {[...Array(3)].map((_, i) => (
                    <span
                      key={i}
                      className="animate-ellipsis-wave inline-block"
                      style={{
                        animationDelay: `${3 - i * -0.15}s`,
                      }}
                    >
                      .
                    </span>
                  ))}
                </span>
              </div>

              <div className="text-content-subtle flex flex-col items-center gap-1 sm:flex-row">
                <CircleInfo className="size-3 shrink-0" />
                <span className="text-xs font-medium">
                  Review all generated content for accuracy and style
                </span>
              </div>
            </div>
          </div>
        }
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
            <header
              className={"sticky top-0 z-10 bg-white/90 backdrop-blur-sm"}
            >
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

            {/* Hero */}
            <div
              className="group relative mt-6"
              data-touched={touchedBlockId === "hero"}
              onClick={() => isMobile && setTouchedBlockId("hero")}
            >
              <EditIndicatorGrid />
              <EditToolbar onEdit={() => setShowEditHeroModal(true)} />
              <div className="mx-auto max-w-screen-sm">
                <div className="px-6">
                  <LanderHero program={program} landerData={landerData} />
                </div>
              </div>
            </div>

            {/* Program rewards */}
            <div
              className="group relative"
              data-touched={touchedBlockId === "rewards"}
              onClick={() => isMobile && setTouchedBlockId("rewards")}
            >
              <EditIndicatorGrid />
              <EditToolbar onEdit={() => setShowEditRewardsModal(true)} />
              <div className="relative mx-auto max-w-screen-sm py-4">
                <div className="px-6">
                  <RewardsDiscountsPreview />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="mx-auto max-w-screen-sm">
              <div className="px-6">
                <div
                  className="animate-scale-in-fade mt-6 flex flex-col gap-2 [animation-delay:400ms] [animation-fill-mode:both]"
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
            <div className="relative z-0 my-6 grid grid-cols-1">
              {landerData?.blocks.map((block, idx) => {
                const Component = BLOCK_COMPONENTS[block.type];
                return Component ? (
                  <div
                    key={block.id}
                    className="group relative py-10"
                    data-touched={touchedBlockId === block.id}
                    onClick={() => isMobile && setTouchedBlockId(block.id)}
                  >
                    <EditIndicatorGrid />

                    {/* Edit toolbar */}
                    <EditToolbar
                      onEdit={() => setEditingBlockId(block.id)}
                      onMoveUp={
                        idx !== 0
                          ? () =>
                              updateBlocks((blocks) =>
                                moveItem(blocks, idx, idx - 1),
                              )
                          : undefined
                      }
                      onMoveDown={
                        idx !== landerData.blocks.length - 1
                          ? () =>
                              updateBlocks((blocks) =>
                                moveItem(blocks, idx, idx + 1),
                              )
                          : undefined
                      }
                      onDelete={() =>
                        updateBlocks((blocks) => blocks.toSpliced(idx, 1))
                      }
                    />

                    {/* Insert block button */}
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-0 opacity-0",
                        "transition-opacity duration-150 group-hover:opacity-100 sm:group-has-[+div:hover]:opacity-100",
                        "group-has-[+div:data-touched=true]:opacity-100 group-data-[touched=true]:opacity-100",
                      )}
                    >
                      <div className="absolute inset-x-0 top-0 z-10 hidden group-first:block">
                        <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                          <AddBlockButton
                            onClick={() => setAddBlockIndex(idx)}
                          />
                        </div>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 z-10">
                        <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                          <AddBlockButton
                            onClick={() => setAddBlockIndex(idx + 1)}
                          />
                        </div>
                      </div>
                    </div>

                    <div
                      className="relative mx-auto max-w-screen-sm"
                      {...{ inert: "" }}
                    >
                      <div className="px-6">
                        <Component
                          block={block}
                          program={{
                            ...program,
                            rewards,
                            discounts,
                            landerData,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null;
              })}

              {!landerData?.blocks?.length && (
                <div className="flex justify-center py-10">
                  <AddBlockButton onClick={() => setAddBlockIndex(0)} />
                </div>
              )}
            </div>
          </div>
        </div>
      </PreviewWindow>
    </>
  );
}

function AddBlockButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      text="Insert block"
      onClick={onClick}
      icon={<Plus2 className="size-2.5" />}
      variant="secondary"
      className="h-6 w-fit gap-1 px-2.5 text-xs"
    />
  );
}

function EditIndicatorGrid() {
  return (
    <div
      className={cn(
        "border-subtle pointer-events-none absolute inset-y-0 left-1/2 w-[1080px] max-w-[calc(100cqw-32px)] -translate-x-1/2 overflow-hidden rounded-xl border",
        "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-data-[touched=true]:opacity-100",
      )}
    >
      <Grid
        cellSize={60}
        className="text-border-subtle inset-[unset] left-1/2 top-1/2 h-[max(1200px,100%)] w-[1200px] -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}

function EditToolbar({
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  onEdit?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[5] opacity-0 transition-opacity duration-150",
        "group-hover:pointer-events-auto group-hover:opacity-100",
        "group-data-[touched=true]:pointer-events-auto group-data-[touched=true]:opacity-100",
      )}
    >
      <div className="absolute right-6 top-2">
        <div className="flex items-center rounded-md border border-neutral-200 bg-white p-1 shadow-sm">
          {onEdit && (
            <EditToolbarTooltip content="Edit">
              <Button
                type="button"
                variant="outline"
                icon={<Pen2 className="size-4" />}
                className="size-7 rounded p-0"
                onClick={onEdit}
              />
            </EditToolbarTooltip>
          )}
          {onMoveUp && (
            <EditToolbarTooltip content="Move up">
              <Button
                type="button"
                variant="outline"
                icon={<ArrowUp className="size-4" />}
                className="size-7 rounded p-0"
                onClick={onMoveUp}
              />
            </EditToolbarTooltip>
          )}
          {onMoveDown && (
            <EditToolbarTooltip content="Move down">
              <Button
                type="button"
                variant="outline"
                icon={<ArrowDown className="size-4" />}
                className="size-7 rounded p-0"
                onClick={onMoveDown}
              />
            </EditToolbarTooltip>
          )}
          {onDelete && (
            <EditToolbarTooltip content="Delete">
              <Button
                type="button"
                variant="outline"
                icon={<Trash className="size-4" />}
                className="size-7 rounded p-0"
                onClick={onDelete}
              />
            </EditToolbarTooltip>
          )}
        </div>
      </div>
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
      disableHoverableContent
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
