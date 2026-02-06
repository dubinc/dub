import type { RewardProps } from "@/lib/types";

export function toRewardActivitySnapshot(reward: RewardProps) {
  return {
    type: reward.type,
    amountInCents: reward.amountInCents ?? null,
    amountInPercentage: reward.amountInPercentage ?? null,
    maxDuration: reward.maxDuration ?? null,
    description: reward.description ?? null,
    modifiers: reward.modifiers ?? null,
  };
}
