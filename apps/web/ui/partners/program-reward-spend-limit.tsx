import { RewardProps } from "@/lib/types";
import { RewardSpendLimitInterval } from "@dub/prisma/client";
import { currencyFormatter } from "@dub/utils";

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
      spendLimitInterval === "allTime"
        ? "in total"
        : `per ${spendLimitInterval}`,
  };
}

export function ProgramRewardSpendLimit({
  spendLimitAmount,
  spendLimitInterval,
}: {
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

  return ` up to ${parts.amount} ${parts.interval}`;
}

export function getSpendLimitCommissionDescription({
  uncappedEarnings,
  cappedEarnings,
  reward,
}: {
  uncappedEarnings: number;
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
  if (uncappedEarnings <= cappedEarnings) {
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
