"use client";

import { getGroupRewardsAndDiscount } from "@/lib/partners/get-group-rewards-and-discount";
import useDiscounts from "@/lib/swr/use-discounts";
import useRewards from "@/lib/swr/use-rewards";
import { GroupWithProgramProps, ProgramApplicationFormData } from "@/lib/types";
import { PreviewWindow } from "@/ui/partners/design/preview-window";
import { LanderRewards } from "@/ui/partners/lander/lander-rewards";
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
import { ProgramApplicationFormField } from "../fields";
import { AddFieldModal, DESIGNER_FIELDS } from "../modals/add-field-modal";
import { useEditApplicationHeroModal } from "../modals/edit-application-hero-modal";
import { usePageBuilderFormContext } from "../page-builder-form";
import RequiredFieldsPreview from "../required-fields-preview";
import { ApplicationFormHero } from "./application-hero-preview";

export function ApplicationPreview({
  group,
}: {
  group: GroupWithProgramProps;
}) {
  const { isMobile } = useMediaQuery();

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolled = useScroll(0, { container: scrollRef });

  const { rewards: groupRewards, discount: groupDiscount } =
    getGroupRewardsAndDiscount(group);

  const { rewards } = useRewards();
  const { discounts } = useDiscounts();
  const program = group.program;

  const { setValue, getValues } = usePageBuilderFormContext();
  const { applicationFormData, brandColor, logo, wordmark } = {
    ...useWatch(),
    ...getValues(),
  };

  const updateFields = useCallback(
    (
      fn: (
        fields: ProgramApplicationFormData["fields"],
      ) => ProgramApplicationFormData["fields"],
    ) => {
      return setValue(
        "applicationFormData",
        {
          ...applicationFormData,
          fields: fn([...applicationFormData.fields]),
        },
        {
          shouldDirty: true,
        },
      );
    },
    [applicationFormData],
  );

  const { setShowEditApplicationHeroModal, EditApplicationHeroModal } = useEditApplicationHeroModal();

  const [addFieldIndex, setAddFieldIndex] = useState<number | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  const [editingField, editingFieldMeta] = useMemo(() => {
    if (!editingFieldId) return [null, null];

    const field = applicationFormData.fields.find(
      (field) => field.id === editingFieldId,
    );

    return [field, DESIGNER_FIELDS.find((b) => b.id === field?.type)];
  }, [applicationFormData, editingFieldId]);

  const [touchedFieldId, setTouchedFieldId] = useState<
    string | "hero" | "rewards" | null
  >(null);

  const fields = applicationFormData?.fields || [];

  return (
    <>
      {editingField && editingFieldMeta && (
        <editingFieldMeta.modal
          defaultValues={editingField}
          showModal={true}
          setShowModal={(show) => !show && setEditingFieldId(null)}
          onSubmit={(field) => {
            updateFields((fields) => {
              fields[fields.findIndex((b) => b.id === editingFieldId)] = field;
              return fields;
            });
            setTouchedFieldId(null);
          }}
        />
      )}
      <EditApplicationHeroModal />
      <AddFieldModal
        addIndex={addFieldIndex ?? 0}
        showAddFieldModal={addFieldIndex !== null}
        setShowAddFieldModal={(show) => {
          if (!show) {
            setAddFieldIndex(null);
            setTouchedFieldId(null);
          }
        }}
      />
      <PreviewWindow
        url={`${PARTNERS_DOMAIN}/${program.slug}/${group.slug}/apply`}
        scrollRef={scrollRef}
        overlay={
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-white/10",
              "pointer-events-none opacity-0 transition-[backdrop-filter,opacity] duration-500",
            )}
            inert
          >
            <div
              className={cn(
                "flex translate-y-1 flex-col items-center gap-6 px-4 text-center text-sm transition-transform duration-500 sm:gap-2",
              )}
            >
              <div className="text-content-default flex items-center">
                <LoadingSpinner className="mr-2 size-3.5 shrink-0" />
                <span className="text-sm font-medium">Generating content</span>
                <span className="ml-px shrink-0">
                  {[...Array(3)].map((_, i) => (
                    <span
                      key={i}
                      className="animate-ellipsis-wave inline-field"
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
                      alt={program.name ?? "Program logo"}
                    />
                  ) : (
                    <Wordmark className="h-7" />
                  )}
                </div>

                <div className="flex items-center gap-2" inert>
                  <Button
                    type="button"
                    variant="secondary"
                    text="Log in"
                    className="animate-fade-in h-8 w-fit text-neutral-600"
                  />
                </div>
              </div>
            </header>

            {/* Hero */}
            <div
              className="group relative mt-6"
              data-touched={touchedFieldId === "hero"}
              onClick={() => isMobile && setTouchedFieldId("hero")}
            >
              <EditIndicatorGrid />
              <EditToolbar onEdit={() => setShowEditApplicationHeroModal(true)} />
              <div className="mx-auto max-w-screen-sm">
                <div className="px-6">
                  <ApplicationFormHero
                    program={program}
                    applicationFormData={applicationFormData}
                    preview
                  />
                </div>
              </div>
            </div>

            {/* Program rewards */}
            <div className="mx-auto mb-1 mt-6 max-w-screen-sm">
              <div className="px-6">
                <LanderRewards
                  rewards={groupRewards}
                  discount={groupDiscount}
                />
              </div>
            </div>

            {/* Required fields */}
            <div className="relative mx-auto max-w-screen-sm py-6">
              <div className="px-6">
                <RequiredFieldsPreview />
              </div>
            </div>

            {/* Content fields */}
            <div className="relative z-0 my-6 grid grid-cols-1">
              {fields.map((field, idx) => {
                return (
                  <div
                    key={field.id}
                    className="group relative py-10"
                    data-touched={touchedFieldId === field.id}
                    onClick={() => isMobile && setTouchedFieldId(field.id)}
                  >
                    <EditIndicatorGrid />

                    {/* Edit toolbar */}
                    <EditToolbar
                      onEdit={() => setEditingFieldId(field.id)}
                      onMoveUp={
                        idx !== 0
                          ? () =>
                              updateFields((fields) =>
                                moveItem(fields, idx, idx - 1),
                              )
                          : undefined
                      }
                      onMoveDown={
                        idx !== applicationFormData.fields.length - 1
                          ? () =>
                              updateFields((fields) =>
                                moveItem(fields, idx, idx + 1),
                              )
                          : undefined
                      }
                      onDelete={() =>
                        updateFields((fields) => fields.toSpliced(idx, 1))
                      }
                    />

                    {/* Insert field button */}
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-0 opacity-0",
                        "transition-opacity duration-150 group-hover:opacity-100 sm:group-has-[+div:hover]:opacity-100",
                        "group-has-[+div[data-[touched=true]]]:opacity-100 group-data-[touched=true]:opacity-100",
                      )}
                    >
                      <div className="group-first:field absolute inset-x-0 top-0 z-10 hidden">
                        <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                          <AddFieldButton
                            onClick={() => setAddFieldIndex(idx)}
                          />
                        </div>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 z-10">
                        <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                          <AddFieldButton
                            onClick={() => setAddFieldIndex(idx + 1)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="relative mx-auto max-w-screen-sm" inert>
                      <div className="px-6">
                        <ProgramApplicationFormField field={field} preview />
                      </div>
                    </div>
                  </div>
                );
              })}

              {fields.length === 0 && (
                <div className="flex justify-center py-10">
                  <AddFieldButton onClick={() => setAddFieldIndex(0)} />
                </div>
              )}
            </div>

            {/* Submit button */}
            <div className="relative mx-auto max-w-screen-sm py-4">
              <div className="px-6">
                <Button
                  text="Submit application"
                  className="mt-4 enabled:border-[var(--brand)] enabled:bg-[var(--brand)] enabled:hover:bg-[var(--brand)] enabled:hover:ring-[var(--brand-ring)]"
                />
              </div>
            </div>
          </div>
        </div>
      </PreviewWindow>
    </>
  );
}

function AddFieldButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      text="Insert field"
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
