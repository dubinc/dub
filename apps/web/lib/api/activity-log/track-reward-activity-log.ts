import { serializeReward } from "@/lib/api/partners/serialize-reward";
import type { RewardProps } from "@/lib/types";
import type { Reward } from "@dub/prisma/client";
import { getResourceDiff } from "./get-resource-diff";
import type { TrackActivityLogInput } from "./track-activity-log";
import { trackActivityLog } from "./track-activity-log";

interface TrackRewardActivityLogParams
  extends Omit<TrackActivityLogInput, "action" | "changeSet" | "resourceType"> {
  old: Reward | RewardProps | null;
  new: Reward | RewardProps | null;
}

function toRewardActivitySnapshot(reward: RewardProps) {
  return {
    type: reward.type,
    amountInCents: reward.amountInCents ?? null,
    amountInPercentage: reward.amountInPercentage ?? null,
    maxDuration: reward.maxDuration ?? null,
    description: reward.description ?? null,
    tooltipDescription: reward.tooltipDescription ?? null,
    modifiers: reward.modifiers ?? null,
  };
}

export function trackRewardActivityLog({
  old: oldReward,
  new: newReward,
  ...baseInput
}: TrackRewardActivityLogParams) {
  if (oldReward === null && newReward !== null) {
    const serialized = serializeReward(newReward as Reward);

    return trackActivityLog({
      ...baseInput,
      resourceType: "reward",
      action: "reward.created",
      changeSet: {
        reward: {
          old: null,
          new: toRewardActivitySnapshot(serialized),
        },
      },
    });
  }

  if (oldReward !== null && newReward === null) {
    const serialized = serializeReward(oldReward as Reward);

    return trackActivityLog({
      ...baseInput,
      resourceType: "reward",
      action: "reward.deleted",
      changeSet: {
        reward: {
          old: toRewardActivitySnapshot(serialized),
          new: null,
        },
      },
    });
  }

  if (oldReward !== null && newReward !== null) {
    const oldSnapshot = toRewardActivitySnapshot(
      serializeReward(oldReward as Reward),
    );

    const newSnapshot = toRewardActivitySnapshot(
      serializeReward(newReward as Reward),
    );

    if (!getResourceDiff(oldSnapshot, newSnapshot)) {
      return;
    }

    return trackActivityLog({
      ...baseInput,
      resourceType: "reward",
      action: "reward.updated",
      changeSet: {
        reward: {
          old: oldSnapshot,
          new: newSnapshot,
        },
      },
    });
  }
}
