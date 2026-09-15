import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { formatRewardConditionClause } from "@/lib/rewards/format-reward-condition";
import { getSpendLimitDescriptionParts } from "@/lib/rewards/reward-spend-limit";
import { RewardConditions, RewardProps } from "@/lib/types";
import { currencyFormatter } from "@dub/utils";

export function buildCommissionDescription({
  reward,
  matchedCondition,
  earnings,
  cappedEarnings,
}: {
  // Already resolved by determinePartnerReward (matched condition amounts applied)
  reward: Pick<
    RewardProps,
    | "event"
    | "type"
    | "amountInCents"
    | "amountInPercentage"
    | "maxDuration"
    | "spendLimitAmount"
    | "spendLimitInterval"
  >;
  matchedCondition?: RewardConditions | null;
  // Pre-spend-limit earnings (used to detect whether the limit was applied)
  earnings?: number;
  // Earnings after spend-limit clamping (same as earnings when not capped)
  cappedEarnings?: number;
}): string {
  const rewardAmount = constructRewardAmount({
    ...reward,
    modifiers: undefined,
  });

  const parts: string[] = ["Earn", rewardAmount];

  if (reward.event === "sale" && reward.maxDuration === 0) {
    parts.push("for the first sale");
  } else {
    parts.push(`per ${reward.event}`);
  }

  // Duration only applies to sale rewards (click/lead are one-off)
  if (reward.event === "sale") {
    if (reward.maxDuration === null) {
      parts.push("for the customer's lifetime");
    } else if (reward.maxDuration && reward.maxDuration >= 1) {
      const durationText =
        reward.maxDuration % 12 === 0
          ? `${reward.maxDuration / 12} year${reward.maxDuration / 12 > 1 ? "s" : ""}`
          : `${reward.maxDuration} month${reward.maxDuration > 1 ? "s" : ""}`;
      parts.push(`for ${durationText}`);
    }
  }

  let description = parts.join(" ");

  if (matchedCondition?.conditions?.length) {
    const clauses = matchedCondition.conditions.map((condition, idx) =>
      formatRewardConditionClause({
        condition,
        event: reward.event,
        operator: matchedCondition.operator,
        isFirst: idx === 0,
      }),
    );

    description += ` ${clauses.join(" ")}`;
  }

  if (earnings != null && cappedEarnings != null && earnings > cappedEarnings) {
    const from = currencyFormatter(earnings, {
      trailingZeroDisplay: "stripIfInteger",
    });
    const to = currencyFormatter(cappedEarnings, {
      trailingZeroDisplay: "stripIfInteger",
    });

    const limitParts = getSpendLimitDescriptionParts({
      spendLimitAmount: reward.spendLimitAmount,
      spendLimitInterval: reward.spendLimitInterval,
    });
    const limitLabel = limitParts
      ? [limitParts.amount, limitParts.interval].filter(Boolean).join(" ")
      : null;

    description += limitLabel
      ? `, capped from ${from} to ${to} due to ${limitLabel} spend limit`
      : `, capped from ${from} to ${to} due to spend limit`;
  }

  return description;
}
