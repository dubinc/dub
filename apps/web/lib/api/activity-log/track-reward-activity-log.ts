import { serializeReward } from "@/lib/api/partners/serialize-reward";
import type {
  ActivityLogAction,
  ChangeSet,
  RewardConditions,
  RewardProps,
} from "@/lib/types";
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
  // Created
  if (oldReward === null && newReward !== null) {
    const newSnapshot = toRewardActivitySnapshot(
      serializeReward(newReward as Reward),
    );

    return trackActivityLog({
      ...baseInput,
      resourceType: "reward",
      action: "reward.created",
      changeSet: {
        reward: {
          old: null,
          new: newSnapshot,
        },
      },
    });
  }

  // Updated
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

    const modifierChanges = getRewardModifierChanges(
      oldSnapshot.modifiers,
      newSnapshot.modifiers,
    );

    const batchId =
      modifierChanges.length > 0 ? crypto.randomUUID() : undefined;

    const logs: TrackActivityLogInput[] = [
      {
        ...baseInput,
        resourceType: "reward",
        action: "reward.updated",
        batchId,
        changeSet: {
          reward: {
            old: oldSnapshot,
            new: newSnapshot,
          },
        },
      },
      ...modifierChanges.map((change) => ({
        ...baseInput,
        resourceType: "reward" as const,
        action: change.action,
        batchId,
        changeSet: change.changeSet,
      })),
    ];

    return trackActivityLog(logs);
  }

  // Deleted
  if (oldReward !== null && newReward === null) {
    const oldSnapshot = toRewardActivitySnapshot(
      serializeReward(oldReward as Reward),
    );

    return trackActivityLog({
      ...baseInput,
      resourceType: "reward",
      action: "reward.deleted",
      changeSet: {
        reward: {
          old: oldSnapshot,
          new: null,
        },
      },
    });
  }
}

function getRewardModifierChanges(
  oldModifiers: RewardConditions[],
  newModifiers: RewardConditions[],
) {
  const results: {
    action: Extract<
      ActivityLogAction,
      | "reward.conditionAdded"
      | "reward.conditionRemoved"
      | "reward.conditionUpdated"
    >;
    changeSet: ChangeSet;
  }[] = [];

  oldModifiers = oldModifiers || [];
  newModifiers = newModifiers || [];

  const diff = getResourceDiff(oldModifiers, newModifiers);

  if (!diff) {
    return results;
  }

  const matchedNewIndices = new Set<number>();
  const matchedOldIndices = new Set<number>();

  for (const [key, { old: oldValue, new: newValue }] of Object.entries(diff)) {
    const index = parseInt(key, 10);
    if (isNaN(index)) continue;

    if (oldValue === undefined && newValue !== undefined) {
      matchedNewIndices.add(index);
      results.push({
        action: "reward.conditionAdded",
        changeSet: {
          condition: {
            old: null,
            new: newValue as RewardConditions,
          },
        },
      });
    } else if (oldValue !== undefined && newValue === undefined) {
      matchedOldIndices.add(index);
      results.push({
        action: "reward.conditionRemoved",
        changeSet: {
          condition: {
            old: oldValue as RewardConditions,
            new: null,
          },
        },
      });
    } else if (
      oldValue !== undefined &&
      newValue !== undefined &&
      !areModifiersEqual(
        oldValue as RewardConditions,
        newValue as RewardConditions,
      )
    ) {
      matchedOldIndices.add(index);
      matchedNewIndices.add(index);
      results.push({
        action: "reward.conditionUpdated",
        changeSet: {
          condition: {
            old: oldValue as RewardConditions,
            new: newValue as RewardConditions,
          },
        },
      });
    }
  }

  return results;
}

function areModifiersEqual(
  mod1: RewardConditions,
  mod2: RewardConditions,
): boolean {
  return JSON.stringify(mod1) === JSON.stringify(mod2);
}
