import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { RewardProps } from "@/lib/types";

export function formatRewardDescription({
  reward,
}: {
  reward: Pick<RewardProps, "amount" | "type" | "event" | "maxDuration">;
}): string {
  const rewardAmount = constructRewardAmount(reward);
  const parts: string[] = [];

  parts.push("Earn");
  parts.push(rewardAmount);

  if (reward.event === "sale" && reward.maxDuration === 0) {
    parts.push("for the first sale");
  } else {
    parts.push(`per ${reward.event}`);
  }

  if (reward.maxDuration === null) {
    parts.push("for the customer's lifetime");
  } else if (reward.maxDuration && reward.maxDuration > 1) {
    const durationText =
      reward.maxDuration % 12 === 0
        ? `${reward.maxDuration / 12} year${reward.maxDuration / 12 > 1 ? "s" : ""}`
        : `${reward.maxDuration} months`;
    parts.push(`for ${durationText}`);
  }

  return parts.join(" ");
}
