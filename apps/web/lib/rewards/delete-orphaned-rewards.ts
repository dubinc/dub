import { pluck } from "@dub/utils";
import { prisma } from "../prisma";
import { REWARD_EVENT_COLUMN_MAPPING } from "../zod/schemas/rewards";

const LINK_REWARD_EVENT_COLUMNS = new Set([
  "clickRewardId",
  "leadRewardId",
  "saleRewardId",
]);

// Delete rewards that are orphaned (not associated with a program or partner group or commissions)
export async function deleteOrphanedRewards(cutoff: Date) {
  const rewards = await prisma.reward.findMany({
    where: {
      programId: null,
      updatedAt: {
        lt: cutoff,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 50,
  });

  if (rewards.length === 0) {
    return 0;
  }

  const rewardsByEvent = Object.groupBy(rewards, (reward) => reward.event);
  const rewardIdsToHardDelete: string[] = [];

  for (const [event, eventRewards] of Object.entries(rewardsByEvent)) {
    if (!eventRewards?.length) {
      continue;
    }

    const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[event];
    const rewardIds = pluck(eventRewards, "id");

    // Not all reward type support link rewards
    const canReferenceLinkReward =
      LINK_REWARD_EVENT_COLUMNS.has(rewardIdColumn);

    const [enrollments, groups, linkRewards, commissions] = await Promise.all([
      prisma.programEnrollment.groupBy({
        by: [rewardIdColumn],
        where: {
          [rewardIdColumn]: {
            in: rewardIds,
          },
        },
      }),

      prisma.partnerGroup.groupBy({
        by: [rewardIdColumn],
        where: {
          [rewardIdColumn]: {
            in: rewardIds,
          },
        },
      }),

      canReferenceLinkReward
        ? prisma.linkReward.groupBy({
            by: [rewardIdColumn],
            where: {
              [rewardIdColumn]: {
                in: rewardIds,
              },
            },
          })
        : Promise.resolve([]),

      prisma.commission.groupBy({
        by: ["rewardId"],
        where: {
          rewardId: {
            in: rewardIds,
          },
        },
      }),
    ]);

    // Collect all reward IDs that are referenced by enrollments, groups, link rewards, or commissions
    const referencedRewardIds = new Set<string>();

    for (const row of [...enrollments, ...groups, ...linkRewards]) {
      const rewardId = row[rewardIdColumn];
      if (typeof rewardId === "string") {
        referencedRewardIds.add(rewardId);
      }
    }

    for (const { rewardId } of commissions) {
      if (rewardId) {
        referencedRewardIds.add(rewardId);
      }
    }

    // If the reward is not referenced by any enrollments, groups, link rewards, or commissions, it can be hard deleted
    for (const reward of eventRewards) {
      if (!referencedRewardIds.has(reward.id)) {
        rewardIdsToHardDelete.push(reward.id);
      }
    }
  }

  if (rewardIdsToHardDelete.length === 0) {
    return 0;
  }

  const { count } = await prisma.reward.deleteMany({
    where: {
      id: {
        in: rewardIdsToHardDelete,
      },
    },
  });

  return count;
}
