import { serializeReward } from "@/lib/api/partners/serialize-reward";
import type { RewardConditions, RewardProps } from "@/lib/types";
import { REWARD_EVENT_TO_RESOURCE_TYPE } from "@/lib/zod/schemas/activity-log";
import type { Reward } from "@dub/prisma/client";
import { getResourceDiff } from "./get-resource-diff";
import type { TrackActivityLogInput } from "./track-activity-log";
import { trackActivityLog } from "./track-activity-log";

interface TrackRewardActivityLogParams
  extends Omit<
    TrackActivityLogInput,
    "action" | "changeSet" | "resourceType" | "batchId"
  > {
  old: Reward | RewardProps | null;
  new: Reward | RewardProps | null;
}

function toRewardActivitySnapshot(reward: RewardProps) {
  return {
    event: reward.event,
    type: reward.type,
    amountInCents: reward.amountInCents ?? null,
    amountInPercentage: reward.amountInPercentage ?? null,
    maxDuration: reward.maxDuration ?? null,
    description: reward.description ?? null,
    tooltipDescription: reward.tooltipDescription ?? null,
    modifiers: reward.modifiers ?? null,
  };
}

function modifierEquals(a: RewardConditions, b: RewardConditions): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function buildModifierChangeSetEntries(
  oldReward: Omit<RewardProps, "id" | "updatedAt">,
  newReward: Omit<RewardProps, "id" | "updatedAt">,
) {
  const oldModifiers = Array.isArray(oldReward.modifiers)
    ? oldReward.modifiers
    : [];
  const newModifiers = Array.isArray(newReward.modifiers)
    ? newReward.modifiers
    : [];

  const logs: Pick<TrackActivityLogInput, "action" | "changeSet">[] = [];

  const oldById = new Map<string, RewardConditions>();
  const newById = new Map<string, RewardConditions>();

  for (const modifier of oldModifiers) {
    if (modifier.id != null && modifier.id !== "") {
      oldById.set(modifier.id, modifier);
    }
  }

  for (const modifier of newModifiers) {
    if (modifier.id != null && modifier.id !== "") {
      newById.set(modifier.id, modifier);
    }
  }

  for (const [id, oldMod] of oldById) {
    const newMod = newById.get(id);

    // Condition removed
    if (newMod === undefined) {
      logs.push({
        action: "reward.conditionRemoved",
        changeSet: {
          reward: {
            old: {
              ...oldReward,
              modifiers: [oldMod],
            },
            new: null,
          },
        },
      });
    }

    // Condition updated
    if (newMod !== undefined && !modifierEquals(oldMod, newMod)) {
      logs.push({
        action: "reward.conditionUpdated",
        changeSet: {
          reward: {
            old: {
              ...oldReward,
              modifiers: [oldMod],
            },
            new: {
              ...newReward,
              modifiers: [newMod],
            },
          },
        },
      });
    }
  }

  for (const [id, newMod] of newById) {
    const oldMod = oldById.get(id);

    // Condition added
    if (oldMod === undefined) {
      logs.push({
        action: "reward.conditionAdded",
        changeSet: {
          reward: {
            old: null,
            new: {
              ...newReward,
              modifiers: [newMod],
            },
          },
        },
      });
    }
  }

  return logs;
}

export function trackRewardActivityLog({
  old: oldReward,
  new: newReward,
  ...baseInput
}: TrackRewardActivityLogParams) {
  const reward = oldReward || newReward;
  const resourceType = reward
    ? REWARD_EVENT_TO_RESOURCE_TYPE[reward.event]
    : null;

  // This should never happen
  if (!resourceType) {
    return;
  }

  if (oldReward === null && newReward !== null) {
    const newSnapshot = toRewardActivitySnapshot(
      serializeReward(newReward as Reward),
    );

    return trackActivityLog({
      ...baseInput,
      resourceType,
      action: "reward.created",
      changeSet: {
        reward: {
          old: null,
          new: newSnapshot,
        },
      },
    });
  }

  const activityLogs: Pick<TrackActivityLogInput, "action" | "changeSet">[] =
    [];

  if (oldReward !== null && newReward !== null) {
    const oldSnapshot = toRewardActivitySnapshot(
      serializeReward(oldReward as Reward),
    );

    const newSnapshot = toRewardActivitySnapshot(
      serializeReward(newReward as Reward),
    );

    const diff = getResourceDiff(oldSnapshot, newSnapshot, {
      fields: [
        "type",
        "amountInCents",
        "amountInPercentage",
        "maxDuration",
        "description",
        "tooltipDescription",
      ],
    });

    if (diff) {
      activityLogs.push({
        ...baseInput,
        action: "reward.updated",
        changeSet: {
          reward: {
            old: oldSnapshot,
            new: newSnapshot,
          },
        },
      });
    }

    activityLogs.push(
      ...buildModifierChangeSetEntries(oldSnapshot, newSnapshot),
    );
  }

  if (oldReward !== null && newReward === null) {
    const oldSnapshot = toRewardActivitySnapshot(
      serializeReward(oldReward as Reward),
    );

    activityLogs.push({
      ...baseInput,
      action: "reward.deleted",
      changeSet: {
        reward: {
          old: oldSnapshot,
          new: null,
        },
      },
    });
  }

  const batchId = activityLogs.length > 0 ? crypto.randomUUID() : undefined;

  const finalActivityLogs: TrackActivityLogInput[] = activityLogs.map(
    (log) => ({
      ...baseInput,
      ...log,
      resourceType,
      ...(batchId && { batchId }),
    }),
  );

  return trackActivityLog(finalActivityLogs);
}
