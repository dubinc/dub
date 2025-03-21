import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { RewardProps } from "@/lib/types";
import { pluralize } from "@dub/utils";

export function formatRewardDescription({
  reward,
}: {
  reward: Pick<RewardProps, "amount" | "type" | "event" | "maxDuration">;
}): string {
  const rewardAmount = constructRewardAmount(reward);
  const parts: string[] = [];

  parts.push(`${rewardAmount} per ${reward.event}`);

  if (reward.event === "sale") {
    if (reward.maxDuration === null) {
      parts.push("for the customer's lifetime");
    } else if (reward.maxDuration === 0) {
      parts.push("for the first purchase");
    } else if (reward.maxDuration && reward.maxDuration > 0) {
      parts.push(
        `for ${reward.maxDuration} ${pluralize("month", reward.maxDuration)}`,
      );
    }
  }

  return parts.join(" ");
}
