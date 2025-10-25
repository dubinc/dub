import { Reward } from "@dub/prisma/client";
import "server-only";
import { RewardProps } from "../../types";

export function serializeReward(reward: Reward | RewardProps): RewardProps {
  return {
    ...reward,
    amountInPercentage:
      reward.amountInPercentage != null
        ? Number(reward.amountInPercentage)
        : null,
  };
}
