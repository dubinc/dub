import { RewardProps } from "@/lib/types";
import { currencyFormatter } from "@dub/utils";
import { EventType, RewardSpendLimitInterval } from "@prisma/client";

export function getSpendLimitDescriptionParts({
  spendLimitAmount,
  spendLimitInterval,
}: Pick<RewardProps, "spendLimitAmount" | "spendLimitInterval">) {
  if (spendLimitAmount == null || spendLimitInterval == null) {
    return null;
  }

  return {
    amount: currencyFormatter(spendLimitAmount, {
      trailingZeroDisplay: "stripIfInteger",
    }),
    interval:
      spendLimitInterval === "allTime" ? "" : `per ${spendLimitInterval}`,
  };
}

export function ProgramRewardSpendLimit({
  event,
  spendLimitAmount,
  spendLimitInterval,
}: {
  event: EventType;
  spendLimitAmount?: number | null;
  spendLimitInterval?: RewardSpendLimitInterval | null;
}) {
  const parts = getSpendLimitDescriptionParts({
    spendLimitAmount,
    spendLimitInterval,
  });

  if (!parts) {
    return null;
  }

  return `, up to ${parts.amount} ${parts.interval} ${event === "sale" ? "per customer" : ""}`;
}

export function buildCommissionDescription({
  earnings,
  cappedEarnings,
  reward,
}: {
  earnings: number;
  cappedEarnings: number;
  reward: Pick<
    RewardProps,
    | "event"
    | "type"
    | "amountInCents"
    | "amountInPercentage"
    | "spendLimitAmount"
    | "spendLimitInterval"
  >;
}) {
  if (earnings <= cappedEarnings) {
    return null;
  }

  const limitParts = getSpendLimitDescriptionParts({
    spendLimitAmount: reward.spendLimitAmount,
    spendLimitInterval: reward.spendLimitInterval,
  });

  if (!limitParts) {
    return null;
  }

  const amount =
    reward.type === "percentage"
      ? `${reward.amountInPercentage ?? 0}%`
      : currencyFormatter(reward.amountInCents ?? 0, {
          trailingZeroDisplay: "stripIfInteger",
        });

  return `Earn ${amount} per ${reward.event} up to ${limitParts.amount} ${limitParts.interval}`;
}
