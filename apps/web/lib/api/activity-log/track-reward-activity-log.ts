import { serializeReward } from "@/lib/api/partners/serialize-reward";
import type { RewardProps } from "@/lib/types";
import type { Reward } from "@dub/prisma/client";
import {
  buildRewardChangeSetEntries,
  toRewardActivitySnapshot,
} from "./build-reward-change-set";
import type { TrackActivityLogInput } from "./track-activity-log";
import { trackActivityLog } from "./track-activity-log";

interface TrackRewardActivityLogParams extends TrackActivityLogInput {
  old: Reward | RewardProps | null;
  new: Reward | RewardProps | null;
}

export function trackRewardActivityLog({
  workspaceId,
  programId,
  userId,
  resourceId,
  parentResourceType,
  parentResourceId,
  old: oldReward,
  new: newReward,
}: TrackRewardActivityLogParams) {
  const baseInput = {
    workspaceId,
    programId,
    userId,
    resourceId,
    parentResourceType,
    parentResourceId,
    resourceType: "reward" as const,
  };

  if (oldReward === null && newReward !== null) {
    const serialized = serializeReward(newReward as Reward);
    return trackActivityLog({
      ...baseInput,
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
    const serializedOld = serializeReward(oldReward as Reward);
    const serializedNew = serializeReward(newReward as Reward);
    const rewardSnapshotOld = toRewardActivitySnapshot(serializedOld);
    const rewardSnapshotNew = toRewardActivitySnapshot(serializedNew);
    const entries = buildRewardChangeSetEntries({
      oldReward: serializedOld,
      newReward: serializedNew,
    });

    const inputs: TrackActivityLogInput[] = entries.map(
      ({ action, changeSet }) => ({
        ...baseInput,
        action,
        changeSet: {
          ...changeSet,
          reward: { old: rewardSnapshotOld, new: rewardSnapshotNew },
        },
      }),
    );

    return trackActivityLog(inputs);
  }
}
