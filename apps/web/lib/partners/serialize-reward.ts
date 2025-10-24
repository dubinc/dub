import { Reward } from "@dub/prisma/client";
import { RewardProps } from "../types";

export function serializeReward(
  reward: Reward | RewardProps | null | undefined,
): RewardProps | null {
  if (!reward) return null;

  return {
    ...reward,
    amountInPercentage: reward.amountInPercentage
      ? Number(reward.amountInPercentage)
      : null,
  };
}
