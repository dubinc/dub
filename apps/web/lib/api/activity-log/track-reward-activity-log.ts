import { serializeReward } from "@/lib/api/partners/serialize-reward";
import type { RewardConditions, RewardProps } from "@/lib/types";
import { rewardConditionsSchema } from "@/lib/zod/schemas/rewards";
import type { Reward } from "@dub/prisma/client";
import type { z } from "zod/v4";
import { getResourceDiff } from "./get-resource-diff";
import type { TrackActivityLogInput } from "./track-activity-log";
import { trackActivityLog } from "./track-activity-log";

type RewardConditionModifier = z.infer<typeof rewardConditionsSchema>;

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

function normalizeModifiers(modifiers: unknown): RewardConditionModifier[] {
  if (!Array.isArray(modifiers)) return [];
  return modifiers.filter(
    (m): m is RewardConditionModifier =>
      m != null &&
      typeof m === "object" &&
      Array.isArray((m as RewardConditionModifier).conditions),
  ) as RewardConditionModifier[];
}

function modifierEquals(
  a: RewardConditionModifier,
  b: RewardConditionModifier,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function buildModifierChangeSetEntries(
  oldModifiers: RewardConditions[],
  newModifiers: RewardConditions[],
) {
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
          condition: {
            old: oldMod,
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
          condition: {
            old: oldMod,
            new: newMod,
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
          condition: {
            old: null,
            new: newMod,
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
        changeSet: diff,
      });
    }

    // Find the reward modifiers diff
    const oldModifiers = Array.isArray(oldReward.modifiers)
      ? oldReward.modifiers
      : [];
    const newModifiers = Array.isArray(newReward.modifiers)
      ? newReward.modifiers
      : [];

    activityLogs.push(
      ...buildModifierChangeSetEntries(oldModifiers, newModifiers),
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

  const finalActivityLogs: TrackActivityLogInput[] = activityLogs.map(
    (log) => ({
      ...baseInput,
      ...log,
      resourceType: "reward",
    }),
  );

  return trackActivityLog(finalActivityLogs);
}
