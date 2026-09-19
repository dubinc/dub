"use client";

import type { TooltipSuggestion } from "@/lib/ai/review-reward-tooltip-schema";
import { formatRewardConditionParts } from "@/lib/rewards/format-reward-condition";
import {
  applyTooltipSuggestion,
  getRewardConditionAttribute,
  type TooltipSuggestionField,
} from "@/lib/rewards/validate-tooltip-suggestion";
import { RewardCondition } from "@/lib/types";
import { Button, InvoiceDollar, Popover, useMediaQuery } from "@dub/ui";
import { Sparkle3 } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { type ReactNode } from "react";
import { useWatch } from "react-hook-form";
import { useAddEditRewardForm } from "./add-edit-reward-sheet";
import {
  tooltipSuggestionPageKey,
  useRewardTooltipConsistencyContext,
} from "./use-reward-tooltip-consistency";

const POPOVER_CONTENT_CLASS_NAME =
  "w-[min(411px,calc(100vw-2rem))] overflow-hidden rounded-xl border-neutral-200 bg-white p-0 drop-shadow-none shadow-[0px_4px_6px_-2px_#0000000D,0px_10px_15px_-3px_#0000001A]";

export function SuggestedFixPopoverHost() {
  const consistency = useRewardTooltipConsistencyContext();

  if (!consistency) return null;

  const {
    pages,
    activeIndex,
    open,
    activeAnchorRef,
    showPage,
    scheduleHide,
    cancelHide,
    hide,
    accept,
    acceptAll,
    dismiss,
    dismissAll,
  } = consistency;

  const activePage = pages[activeIndex];
  const isMultiple = pages.length > 1;

  return (
    <Popover
      openPopover={open && !!activePage}
      setOpenPopover={(next) => {
        if (!next) hide();
      }}
      align="start"
      sideOffset={8}
      virtualAnchorRef={activeAnchorRef}
      onOpenAutoFocus={(event) => event.preventDefault()}
      popoverContentClassName={POPOVER_CONTENT_CLASS_NAME}
      content={
        activePage ? (
          <div onMouseEnter={cancelHide} onMouseLeave={scheduleHide}>
            <SuggestedFixContent
              suggestion={activePage.suggestion}
              field={activePage.field}
              index={activeIndex}
              total={pages.length}
              onNext={() => showPage((activeIndex + 1) % pages.length)}
              onDiscard={() => {
                if (isMultiple) {
                  dismissAll();
                } else {
                  dismiss(activePage.suggestion);
                }
              }}
              onAccept={() => {
                if (isMultiple) {
                  acceptAll();
                } else {
                  accept(activePage.suggestion);
                }
              }}
            />
          </div>
        ) : (
          <div />
        )
      }
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-0 w-0 overflow-hidden opacity-0"
      />
    </Popover>
  );
}

export function SuggestedFixBadge({
  text,
  field,
  modifierIndex,
  conditionIndex,
}: {
  text: string;
  field: TooltipSuggestionField;
  modifierIndex: number;
  conditionIndex: number;
}) {
  const consistency = useRewardTooltipConsistencyContext();
  const { isMobile } = useMediaQuery();

  if (!consistency) return null;

  const thisIndex = consistency.getPageIndex(
    modifierIndex,
    conditionIndex,
    field,
  );

  if (thisIndex === -1) return null;

  const isOpen = consistency.open && consistency.activeIndex === thisIndex;

  return (
    <button
      type="button"
      ref={(element) =>
        consistency.registerBadge(
          tooltipSuggestionPageKey({ modifierIndex, conditionIndex, field }),
          element,
        )
      }
      onMouseEnter={() => {
        if (!isMobile) consistency.showPage(thisIndex);
      }}
      onMouseLeave={() => {
        if (!isMobile) consistency.scheduleHide();
      }}
      onClick={() => {
        if (!isMobile) return;

        if (isOpen) {
          consistency.hide();
          return;
        }

        consistency.showPage(thisIndex);
      }}
      className="inline-block rounded bg-[#FFFBEB] px-1.5 text-left text-sm font-semibold text-[#973C00] transition-colors"
    >
      <span>
        <Sparkle3
          variant="fill"
          className="mr-1 inline-block size-3 align-middle text-[#E17100]"
        />
        {text}
      </span>
    </button>
  );
}

function SuggestedFixContent({
  suggestion,
  field,
  index,
  total,
  onNext,
  onDiscard,
  onAccept,
}: {
  suggestion: TooltipSuggestion;
  field: TooltipSuggestionField;
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

  const patched = applyTooltipSuggestion(
    current,
    field === "operator"
      ? { operator: suggestion.suggested.operator }
      : { value: suggestion.suggested.value },
  );
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
          <span className="flex h-4 w-fit items-center justify-center rounded-md bg-[#EDEDED] px-1 text-[12px] font-semibold leading-4 tracking-[-0.02em] text-[#404040]">
            {index + 1} of {total}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 p-3">
        <div className="flex min-h-16 w-full items-start gap-2 rounded-[10px] border border-neutral-200 bg-white p-2.5 shadow-[0px_2px_4px_0px_#00000008]">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-neutral-50">
            <InvoiceDollar className="size-3.5 text-neutral-800" />
          </div>
          <p className="min-w-0 text-sm font-medium leading-relaxed text-neutral-800">
            If <PreviewChip>{entityLabel}</PreviewChip>{" "}
            <PreviewChip>{attributeLabel}</PreviewChip>{" "}
            <PreviewChip changed={field === "operator"}>
              {operatorLabel}
            </PreviewChip>{" "}
            <PreviewChip changed={field === "value"}>{valueLabel}</PreviewChip>
          </p>
        </div>

        <SuggestedFixReason reason={suggestion.reason} />
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

function SuggestedFixReason({ reason }: { reason: string }) {
  const nodes: ReactNode[] = [];
  const quoteRe = /"([^"]+)"|“([^”]+)”/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = quoteRe.exec(reason)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(reason.slice(lastIndex, match.index));
    }

    nodes.push(
      <span key={key++} className="font-semibold">
        {match[0]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < reason.length) {
    nodes.push(reason.slice(lastIndex));
  }

  return (
    <p className="text-sm font-normal leading-[1.4] tracking-[-0.02em] text-neutral-800">
      {nodes}
    </p>
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
