"use client";

import type { TooltipSuggestion } from "@/lib/ai/review-reward-tooltip-schema";
import { formatRewardConditionParts } from "@/lib/rewards/format-reward-condition";
import {
  applyTooltipSuggestion,
  getRewardConditionAttribute,
  suggestionTouchesField,
} from "@/lib/rewards/validate-tooltip-suggestion";
import { RewardCondition } from "@/lib/types";
import { Button, InvoiceDollar, Popover, useMediaQuery } from "@dub/ui";
import { Sparkle3 } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useRef, useState, type ReactNode } from "react";
import { useWatch } from "react-hook-form";
import { useAddEditRewardForm } from "./add-edit-reward-sheet";
import { useRewardTooltipConsistencyContext } from "./use-reward-tooltip-consistency";

export function SuggestedFixBadge({
  text,
  modifierIndex,
  conditionIndex,
}: {
  text: string;
  modifierIndex: number;
  conditionIndex: number;
}) {
  const consistency = useRewardTooltipConsistencyContext();
  const { isMobile } = useMediaQuery();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);

  if (!consistency) return null;

  const {
    suggestions,
    activeIndex,
    setActiveIndex,
    accept,
    acceptAll,
    dismiss,
    dismissAll,
  } = consistency;

  const thisIndex = suggestions.findIndex(
    (suggestion) =>
      suggestion.modifierIndex === modifierIndex &&
      suggestion.conditionIndex === conditionIndex,
  );

  if (thisIndex === -1) return null;

  const clearClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  };

  const scheduleClose = () => {
    if (isMobile) return;
    clearClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  };

  const active = suggestions[activeIndex] ?? suggestions[thisIndex];
  const isMultiple = suggestions.length > 1;

  return (
    <Popover
      openPopover={open}
      setOpenPopover={setOpen}
      align="start"
      sideOffset={8}
      onOpenAutoFocus={(event) => event.preventDefault()}
      popoverContentClassName="w-[min(411px,calc(100vw-2rem))] overflow-hidden rounded-xl border-neutral-200 bg-white p-0 drop-shadow-none shadow-[0px_4px_6px_-2px_#0000000D,0px_10px_15px_-3px_#0000001A]"
      content={
        <div
          onMouseEnter={() => {
            if (!isMobile) {
              clearClose();
              setOpen(true);
            }
          }}
          onMouseLeave={scheduleClose}
        >
          <SuggestedFixContent
            suggestion={active}
            index={Math.max(activeIndex, 0)}
            total={suggestions.length}
            onNext={() =>
              setActiveIndex((activeIndex + 1) % suggestions.length)
            }
            onDiscard={() => {
              if (isMultiple) {
                dismissAll();
              } else {
                dismiss(active);
              }
              setOpen(false);
            }}
            onAccept={() => {
              if (isMultiple) {
                acceptAll();
              } else {
                accept(active);
              }
              setOpen(false);
            }}
          />
        </div>
      }
    >
      <button
        type="button"
        onMouseEnter={() => {
          if (!isMobile) {
            clearClose();
            setActiveIndex(thisIndex);
            setOpen(true);
          }
        }}
        onMouseLeave={scheduleClose}
        onClick={() => {
          if (isMobile) {
            setOpen((current) => !current);
            setActiveIndex(thisIndex);
          }
        }}
        className="inline-flex items-center gap-1 rounded bg-[#FFFBEB] px-1.5 text-left text-sm font-semibold text-[#973C00] transition-colors"
      >
        <Sparkle3 variant="fill" className="size-3 shrink-0 text-[#E17100]" />
        {text}
      </button>
    </Popover>
  );
}

function SuggestedFixContent({
  suggestion,
  index,
  total,
  onNext,
  onDiscard,
  onAccept,
}: {
  suggestion: TooltipSuggestion;
  index: number;
  total: number;
  onNext: () => void;
  onDiscard: () => void;
  onAccept: () => void;
}) {
  const { control } = useAddEditRewardForm();
  const [event, modifiers] = useWatch({
    control,
    name: ["event", "modifiers"],
  });

  const current =
    modifiers?.[suggestion.modifierIndex]?.conditions?.[
      suggestion.conditionIndex
    ];

  if (!current?.entity || !current.attribute || !current.operator) {
    return null;
  }

  const patched = applyTooltipSuggestion(current, suggestion.suggested);
  const entity = patched.entity ?? current.entity;
  const attribute = patched.attribute ?? current.attribute;
  const operator = patched.operator ?? current.operator;
  const attributeType = getRewardConditionAttribute({
    event,
    entity,
    attribute,
  })?.type;

  const { entityLabel, attributeLabel, operatorLabel, valueLabel } =
    formatRewardConditionParts({
      event,
      condition: {
        entity,
        attribute,
        operator,
        value:
          attributeType === "currency" && typeof patched.value === "number"
            ? patched.value * 100
            : patched.value,
        label: patched.label,
        metadataField: patched.metadataField,
      } as RewardCondition,
    });

  const isMultiple = total > 1;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 p-3">
        <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-900">
          <Sparkle3 variant="fill" className="size-3.5" />
          Suggested fix
        </div>
        {isMultiple && (
          <span className="text-xs text-neutral-500">
            {index + 1} of {total}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 p-3">
        <div className="rounded-lg bg-neutral-50 px-2.5 py-2">
          <div className="flex items-start gap-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white">
              <InvoiceDollar className="size-3.5 text-neutral-800" />
            </div>
            <p className="min-w-0 text-sm font-medium leading-relaxed text-neutral-800">
              If <PreviewChip>{entityLabel}</PreviewChip>{" "}
              <PreviewChip>{attributeLabel}</PreviewChip>{" "}
              <PreviewChip
                changed={suggestionTouchesField({
                  field: "operator",
                  current,
                  suggested: suggestion.suggested,
                })}
              >
                {operatorLabel}
              </PreviewChip>{" "}
              <PreviewChip
                changed={suggestionTouchesField({
                  field: "value",
                  current,
                  suggested: suggestion.suggested,
                })}
              >
                {valueLabel}
              </PreviewChip>
            </p>
          </div>
        </div>

        <p className="text-sm text-neutral-600">{suggestion.reason}</p>
      </div>

      <div
        className={cn(
          "flex items-center gap-2 border-t border-neutral-200 px-3 py-2",
          isMultiple ? "justify-between" : "justify-end",
        )}
      >
        {isMultiple && (
          <button
            type="button"
            onClick={onNext}
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            Next
          </button>
        )}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-7 w-fit rounded-lg px-3 py-2"
            text="Discard"
            onClick={onDiscard}
          />
          <Button
            type="button"
            variant="primary"
            className="h-7 w-fit rounded-lg px-3 py-2"
            text={isMultiple ? "Accept all changes" : "Accept change"}
            onClick={onAccept}
          />
        </div>
      </div>
    </div>
  );
}

function PreviewChip({
  children,
  changed,
}: {
  children: ReactNode;
  changed?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded px-1.5 text-sm font-semibold",
        changed ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700",
      )}
    >
      {children}
    </span>
  );
}
