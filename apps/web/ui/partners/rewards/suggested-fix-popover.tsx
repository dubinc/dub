"use client";

import type {
  PayoutFix,
  TooltipSuggestion,
} from "@/lib/ai/review-reward-tooltip-schema";
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
import { type ReactNode, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { useAddEditRewardForm } from "./add-edit-reward-sheet";
import {
  tooltipSuggestionPageKey,
  useRewardTooltipConsistencyContext,
} from "./use-reward-tooltip-consistency";

const POPOVER_CONTENT_CLASS_NAME =
  "w-[min(411px,calc(100vw-2rem))] overflow-hidden rounded-xl border-neutral-200 bg-white p-0 drop-shadow-none shadow-[0px_4px_6px_-2px_#0000000D,0px_10px_15px_-3px_#0000001A]";

const SUGGESTED_FIX_BADGE_CLASS_NAME =
  "inline-flex max-w-full items-center gap-1 rounded bg-[#FFFBEB] px-1.5 text-left text-sm font-semibold leading-5 text-[#973C00] transition-colors";

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
      className={SUGGESTED_FIX_BADGE_CLASS_NAME}
    >
      <Sparkle3 variant="fill" className="size-3 shrink-0 text-[#E17100]" />
      <span className="min-w-0 truncate">{text}</span>
    </button>
  );
}

export function ReviewingSuggestedFixBadge({ text }: { text: string }) {
  const consistency = useRewardTooltipConsistencyContext();
  const { isMobile } = useMediaQuery();
  const closeTimerRef = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const reviewing = consistency?.status === "reviewing";
  const payoutFixes = reviewing ? [] : consistency?.payoutFixes ?? [];
  const note = reviewing || payoutFixes.length ? null : consistency?.note;

  if (!consistency || (!reviewing && !note && !payoutFixes.length)) return null;

  const cancelHide = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
  };

  const scheduleHide = () => {
    cancelHide();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 300);
  };

  return (
    <Popover
      openPopover={open}
      setOpenPopover={setOpen}
      align="start"
      sideOffset={8}
      onOpenAutoFocus={(event) => event.preventDefault()}
      popoverContentClassName={POPOVER_CONTENT_CLASS_NAME}
      content={
        <div onMouseEnter={cancelHide} onMouseLeave={scheduleHide}>
          <div className="flex items-center gap-1.5 border-b border-neutral-200 p-3 text-sm font-medium text-neutral-900">
            <Sparkle3 variant="fill" className="size-3.5" />
            Suggested fix
          </div>
          {reviewing ? (
            <div className="flex flex-col gap-3 p-3">
              <div className="h-16 animate-pulse rounded-[10px] bg-neutral-100" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-neutral-200" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-200" />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 p-3">
                {payoutFixes.length ? (
                  <PayoutFixPreview fixes={payoutFixes} />
                ) : (
                  <p className="text-sm leading-relaxed text-neutral-600">
                    {note}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-3 py-2">
                <Button
                  type="button"
                  variant="secondary"
                  text="Discard"
                  className="h-7 w-fit rounded-lg px-3 py-2"
                  onClick={() => {
                    consistency.dismissNote();
                    setOpen(false);
                  }}
                />
                {payoutFixes.length > 0 && (
                  <Button
                    type="button"
                    variant="primary"
                    text={
                      payoutFixes.length > 1
                        ? "Accept all changes"
                        : "Accept change"
                    }
                    className="h-7 w-fit rounded-lg px-3 py-2"
                    onClick={() => {
                      consistency.acceptPayouts();
                      setOpen(false);
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      }
    >
      <button
        type="button"
        onMouseEnter={() => {
          if (isMobile) return;
          cancelHide();
          setOpen(true);
        }}
        onMouseLeave={() => {
          if (!isMobile) scheduleHide();
        }}
        onClick={() => {
          if (!isMobile) return;
          setOpen((current) => !current);
        }}
        className={SUGGESTED_FIX_BADGE_CLASS_NAME}
      >
        <Sparkle3 variant="fill" className="size-3 shrink-0 text-[#E17100]" />
        <span className="min-w-0 truncate">{text}</span>
      </button>
    </Popover>
  );
}

function PayoutFixPreview({ fixes }: { fixes: PayoutFix[] }) {
  const { control } = useAddEditRewardForm();
  const [
    event,
    type,
    amountInCents,
    amountInPercentage,
    maxDuration,
    modifiers,
  ] = useWatch({
    control,
    name: [
      "event",
      "type",
      "amountInCents",
      "amountInPercentage",
      "maxDuration",
      "modifiers",
    ],
  });
  const reason = fixes[0]?.reason;

  return (
    <>
      <div className="flex min-h-16 w-full flex-col gap-2 rounded-[10px] border border-neutral-200 bg-white p-2.5 shadow-[0px_2px_4px_0px_#00000008]">
        {fixes.map((fix) => {
          const group =
            fix.scope === "group" && typeof fix.modifierIndex === "number";
          const modifier = group ? modifiers?.[fix.modifierIndex!] : null;
          const payoutType =
            (group ? modifier?.type || type : type) === "percentage"
              ? "percentage"
              : "flat";
          const currentAmount =
            payoutType === "percentage"
              ? group
                ? modifier?.amountInPercentage
                : amountInPercentage
              : group
                ? modifier?.amountInCents
                : amountInCents;
          const currentDuration = group
            ? modifier?.maxDuration === undefined
              ? maxDuration
              : modifier?.maxDuration
            : maxDuration;
          const nextAmount =
            typeof fix.amount === "number" ? fix.amount : currentAmount;
          const nextDuration =
            fix.maxDuration === undefined ? currentDuration : fix.maxDuration;
          const amountLabel =
            nextAmount == null || Number.isNaN(nextAmount)
              ? "amount"
              : payoutType === "percentage"
                ? `${nextAmount}%`
                : `$${nextAmount}`;
          const durationLabel =
            nextDuration == null || !Number.isFinite(nextDuration)
              ? "for the customer's lifetime"
              : nextDuration === 0
                ? "one time"
                : `for ${nextDuration} month${nextDuration === 1 ? "" : "s"}`;

          return (
            <p
              key={group ? `group-${fix.modifierIndex}` : "default"}
              className="min-w-0 text-sm font-medium leading-relaxed text-neutral-800"
            >
              {group ? "Then pay a" : "Pay a"}{" "}
              <PreviewChip changed={typeof fix.amount === "number"}>
                {amountLabel}
              </PreviewChip>{" "}
              per {event}{" "}
              <PreviewChip changed={fix.maxDuration !== undefined}>
                {durationLabel}
              </PreviewChip>
            </p>
          );
        })}
      </div>
      {reason && <SuggestedFixReason reason={reason} />}
    </>
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
