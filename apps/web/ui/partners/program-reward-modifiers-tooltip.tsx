"use client";

import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { getRewardAmount } from "@/lib/partners/get-reward-amount";
import { formatRewardConditionParts } from "@/lib/rewards/format-reward-condition";
import { RewardCondition, RewardConditions, RewardProps } from "@/lib/types";
import { InfoTooltip, useScrollProgress } from "@dub/ui";
import { capitalize, cn, pluralize } from "@dub/utils";
import { useRef } from "react";

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
    <span className="inline-block align-text-top">
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
    </span>
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
                spendLimitAmount: reward.spendLimitAmount,
                spendLimitInterval: reward.spendLimitInterval,
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
  conditions?: RewardCondition[];
  operator?: RewardConditions["operator"];
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
            const { entityLabel, attributeLabel, operatorLabel, valueLabel } =
              formatRewardConditionParts({
                condition,
                event: reward.event,
              });

            return (
              <li key={idx} className="flex items-start gap-1">
                <span className="shrink-0 text-lg leading-none">&bull;</span>
                <span className="min-w-0">
                  {idx === 0 ? "If" : capitalize(operator)} {entityLabel}{" "}
                  {attributeLabel} {operatorLabel}
                  {/* Omit empty formatter output; still show valid zeros. */}
                  {valueLabel ? ` ${valueLabel}` : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
