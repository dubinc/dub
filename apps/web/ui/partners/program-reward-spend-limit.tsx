import { getSpendLimitDescriptionParts } from "@/lib/rewards/reward-spend-limit";
import { EventType, RewardSpendLimitInterval } from "@prisma/client";

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

  return [
    `, up to ${parts.amount}`,
    parts.interval,
    event === "sale" ? "per customer" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
