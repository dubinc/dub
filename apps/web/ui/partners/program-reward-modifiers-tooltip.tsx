"use client";

import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { RewardConditions, RewardProps } from "@/lib/types";
import {
  CONDITION_OPERATOR_LABELS,
  REWARD_CONDITIONS,
  rewardConditionSchema,
  rewardConditionsSchema,
} from "@/lib/zod/schemas/rewards";
import { InfoTooltip, useScrollProgress } from "@dub/ui";
import {
  COUNTRIES,
  capitalize,
  cn,
  currencyFormatter,
  formatDateTime,
  pluralize,
} from "@dub/utils";
import { formatDuration } from "date-fns";
import { useRef } from "react";
import * as z from "zod/v4";

interface ProgramRewardModifiersTooltipProps {
  reward?: Omit<RewardProps, "id" | "updatedAt"> | null;
}

interface ProgramRewardModifiersTooltipContentProps {
  reward?: Omit<RewardProps, "id" | "updatedAt"> | null;
  showBottomGradient?: boolean;
  showBaseReward?: boolean;
  className?: string;
}

export function ProgramRewardModifiersTooltip({
  reward,
}: ProgramRewardModifiersTooltipProps) {
  if (!reward?.modifiers?.length && !reward?.tooltipDescription) return null;

  return (
    <div className="inline-block align-text-top">
      <InfoTooltip
        content={
          reward.tooltipDescription || (
            <ProgramRewardModifiersTooltipContent
              reward={reward}
              showBottomGradient={true}
              showBaseReward={true}
            />
          )
        }
        contentClassName={reward.tooltipDescription ? "text-left" : undefined}
      />
    </div>
  );
}

export function ProgramRewardModifiersTooltipContent({
  reward,
  showBottomGradient = true,
  showBaseReward = true,
  className,
}: ProgramRewardModifiersTooltipContentProps & {
  showBottomGradient?: boolean;
  showBaseReward?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  if (!reward?.modifiers?.length) return null;

  const nonZeroBaseAmount = getRewardAmount(reward) !== 0;
  const displayBaseReward = showBaseReward && nonZeroBaseAmount;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={updateScrollProgress}
        className={cn(
          "scrollbar-hide max-h-[calc(var(--radix-popper-available-height,100dvh)-12px)] max-w-sm space-y-2 overflow-y-auto p-3",
          className,
        )}
      >
        {displayBaseReward && <RewardItem reward={reward} />}
        {(reward.modifiers as RewardConditions[]).map((modifier, idx) => (
          <div key={idx} className="space-y-2">
            {(displayBaseReward || idx > 0) && (
              <span className="flex w-full items-center justify-center rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-600">
                OR
              </span>
            )}

            <RewardItem
              reward={{
                event: reward.event,
                type: modifier.type === undefined ? reward.type : modifier.type, // fallback to primary
                amountInCents: modifier.amountInCents,
                amountInPercentage: modifier.amountInPercentage,
                maxDuration:
                  modifier.maxDuration === undefined
                    ? reward.maxDuration
                    : modifier.maxDuration, // fallback to primary
              }}
              conditions={modifier.conditions}
              operator={modifier.operator}
            />
          </div>
        ))}
      </div>

      {showBottomGradient && (
        <div
          className="pointer-events-none absolute bottom-0 left-0 hidden h-16 w-full rounded-b-lg bg-gradient-to-t from-white sm:block"
          style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
        />
      )}
    </div>
  );
}

// TODO:
// This became a bit of a mess, let's clean it up a bit.
const RewardItem = ({
  reward,
  conditions,
  operator = "AND",
}: {
  reward: Omit<RewardProps, "id" | "updatedAt">;
  conditions?: z.infer<typeof rewardConditionSchema>[];
  operator?: z.infer<typeof rewardConditionsSchema>["operator"];
}) => {
  const rewardAmount = constructRewardAmount({
    ...reward,
    modifiers: undefined,
  });

  const durationText =
    reward.maxDuration === null
      ? "for the customer's lifetime"
      : reward.maxDuration === 0
        ? "one time"
        : reward.maxDuration && reward.maxDuration % 12 === 0
          ? `for ${reward.maxDuration / 12} ${pluralize(
              "year",
              reward.maxDuration / 12,
            )}`
          : reward.maxDuration
            ? `for ${reward.maxDuration} months`
            : "";

  return (
    <div>
      <div className="text-content-default text-xs font-semibold">
        {rewardAmount} per {reward.event}
        {reward.event === "sale" && durationText ? ` ${durationText}` : ""}
      </div>

      {conditions && conditions.length > 0 && (
        <ul className="ml-1 text-xs font-medium text-neutral-600">
          {conditions.map((condition, idx) => {
            const entity = REWARD_CONDITIONS[reward.event].entities.find(
              (e) => e.id === condition.entity,
            );
            const attribute = (() => {
              if (!entity) return undefined;
              const top = entity.attributes.find(
                (a) => a.id === condition.attribute,
              );
              if (top?.nestedAttributes?.length && condition.nestedAttribute) {
                return top.nestedAttributes.find(
                  (n) => n.id === condition.nestedAttribute,
                );
              }
              if (top) return top;
              for (const a of entity.attributes) {
                const nested = a.nestedAttributes?.find(
                  (n) => n.id === condition.attribute,
                );
                if (nested) return nested;
              }
              return undefined;
            })();

            return (
              <li key={idx} className="flex items-start gap-1">
                <span className="shrink-0 text-lg leading-none">&bull;</span>
                <span className="min-w-0">
                  {idx === 0 ? "If" : capitalize(operator.toLowerCase())}{" "}
                  {condition.entity} {attribute?.label?.toLowerCase()}{" "}
                  {CONDITION_OPERATOR_LABELS[condition.operator]}{" "}
                  {condition.value &&
                    (condition.attribute === "country"
                      ? // Country names
                        Array.isArray(condition.value)
                        ? (condition.value as any[])
                            .map((v) => COUNTRIES[v?.toString()] ?? v)
                            .join(", ")
                        : COUNTRIES[condition.value?.toString()] ??
                          condition.value
                      : (condition.nestedAttribute ?? condition.attribute) ===
                          "subscriptionDurationMonths"
                        ? formatSubscriptionDuration(Number(condition.value))
                          : attribute?.type === "date"
                            ? (() => {
                                try {
                                  const val = condition.value;
                                  const d =
                                    typeof val === "string"
                                      ? new Date(val)
                                      : val instanceof Date
                                        ? val
                                        : Array.isArray(val)
                                          ? null
                                          : new Date(Number(val));
                                  if (!d || isNaN(d.getTime()))
                                    return String(condition.value);
                                  return formatDateTime(d);
                                } catch {
                                  return String(condition.value);
                                }
                              })()
                          : // Non-country value(s)
                            Array.isArray(condition.value)
                            ? // Basic array
                              (attribute?.options
                                ? (condition.value as string[] | number[]).map(
                                    (v) =>
                                      attribute.options?.find(
                                        (o) => o.id === v,
                                      )?.label ?? v,
                                  )
                                : condition.value
                              ).join(", ")
                            : (condition.nestedAttribute ?? condition
                                  .attribute) === "productId" && condition.label
                              ? // Product label
                                condition.label
                              : attribute?.type === "currency"
                                ? // Currency value
                                  currencyFormatter(Number(condition.value))
                                : // Everything else
                                  attribute?.options
                                  ? attribute.options.find(
                                      (o) => o.id === condition.value,
                                    )?.label ?? condition.value.toString()
                                  : condition.value.toString())}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

function formatSubscriptionDuration(v: number): string {
  return formatDuration(
    v >= 12 ? { years: Math.floor(v / 12), months: v % 12 } : { months: v },
  );
}
