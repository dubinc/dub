import type { Reward } from "@dub/prisma/client";
import "server-only";

// Convert Prisma.Decimal object to number
// should not send Prisma.Decimal to the client
export function serializeReward(reward: Reward) {
  return {
    ...reward,
    amountInPercentage:
      reward.amountInPercentage != null
        ? Number(reward.amountInPercentage)
        : null,
  };
}
