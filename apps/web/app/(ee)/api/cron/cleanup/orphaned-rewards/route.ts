import { PRISMA_UPDATEMANY_LIMIT } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { subMinutes } from "date-fns";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const STALE_AFTER_MINUTES = 30;

// Safety net for leftover rows after request-path updates:
// - Rewards: rewards/process normally hard-deletes once enrollments are cleared,
//   but a newer reward change can skip stale jobs (e.g. delete then create).
// - LinkReward: update-partner-link nulls override IDs instead of deleting the row.
//   Discount deletes SetNull LinkReward.discountId the same way.

// POST /api/cron/cleanup/orphaned-rewards
export const POST = withCron(async () => {
  const cutoff = subMinutes(new Date(), STALE_AFTER_MINUTES);

  const [deletedRewardsCount, deletedLinkRewardsCount] = await Promise.all([
    deleteOrphanedRewards(cutoff),
    deleteEmptyLinkRewards(),
  ]);

  if (deletedRewardsCount === 0 && deletedLinkRewardsCount === 0) {
    return logAndRespond("No orphaned rewards or empty link rewards found.");
  }

  return logAndRespond(
    `Finished cleanup (${deletedRewardsCount} rewards, ${deletedLinkRewardsCount} empty link rewards deleted).`,
  );
});

async function deleteOrphanedRewards(cutoff: Date) {
  const rewards = await prisma.reward.findMany({
    where: {
      programId: null,
      updatedAt: {
        lt: cutoff,
      },
    },
    select: {
      id: true,
      clickPartnerGroup: true,
      leadPartnerGroup: true,
      salePartnerGroup: true,
      referralPartnerGroup: true,
      customPartnerGroup: true,
      _count: {
        select: {
          clickEnrollments: true,
          leadEnrollments: true,
          saleEnrollments: true,
          referralEnrollments: true,
          customEnrollments: true,
        },
      },
    },
    orderBy: {
      updatedAt: "asc",
    },
    take: 100,
  });

  if (rewards.length === 0) {
    return 0;
  }

  const rewardsToDelete = rewards.filter((reward) => {
    return (
      reward.clickPartnerGroup === null &&
      reward.leadPartnerGroup === null &&
      reward.salePartnerGroup === null &&
      reward.referralPartnerGroup === null &&
      reward.customPartnerGroup === null &&
      reward._count.clickEnrollments === 0 &&
      reward._count.leadEnrollments === 0 &&
      reward._count.saleEnrollments === 0 &&
      reward._count.referralEnrollments === 0 &&
      reward._count.customEnrollments === 0
    );
  });

  console.log(
    `Found ${rewardsToDelete.length} rewards to delete out of ${rewards.length} rewards (some of them are referenced by partner groups or program enrollments).`,
  );

  if (rewardsToDelete.length === 0) {
    return 0;
  }

  const deletedRewards = await prisma.reward.deleteMany({
    where: {
      id: {
        in: rewardsToDelete.map((reward) => reward.id),
      },
    },
  });

  return deletedRewards.count;
}

async function deleteEmptyLinkRewards() {
  let deletedCount = 0;

  while (true) {
    const { count } = await prisma.linkReward.deleteMany({
      where: {
        clickRewardId: null,
        leadRewardId: null,
        saleRewardId: null,
        discountId: null,
      },
      limit: PRISMA_UPDATEMANY_LIMIT,
    });

    if (count === 0) {
      break;
    }

    deletedCount += count;
  }

  return deletedCount;
}
