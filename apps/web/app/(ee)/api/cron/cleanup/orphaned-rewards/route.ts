import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { subMinutes } from "date-fns";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// The rewards/process cron normally hard-deletes once enrollments are cleared, but a newer
// reward change for the same group + event type can bump the version and skip stale jobs
// (e.g. delete then create), leaving the old row behind. This job is a safety net for those orphans.

// POST /api/cron/cleanup/orphaned-rewards
export const POST = withCron(async () => {
  const rewards = await prisma.reward.findMany({
    where: {
      programId: null,
      updatedAt: {
        lt: subMinutes(new Date(), 30), // only look for rewards older than 30 minutes ago
      },
    },
    select: {
      id: true,
      clickPartnerGroup: true,
      leadPartnerGroup: true,
      salePartnerGroup: true,
      referralPartnerGroup: true,
      _count: {
        select: {
          clickEnrollments: true,
          leadEnrollments: true,
          saleEnrollments: true,
          referralEnrollments: true,
        },
      },
    },
    orderBy: {
      updatedAt: "asc",
    },
    take: 100,
  });

  if (rewards.length === 0) {
    return logAndRespond("No orphaned rewards found.");
  }

  const rewardsToDelete = rewards.filter((reward) => {
    return (
      reward.clickPartnerGroup === null &&
      reward.leadPartnerGroup === null &&
      reward.salePartnerGroup === null &&
      reward.referralPartnerGroup === null &&
      reward._count.clickEnrollments === 0 &&
      reward._count.leadEnrollments === 0 &&
      reward._count.saleEnrollments === 0 &&
      reward._count.referralEnrollments === 0
    );
  });

  console.log(
    `Found ${rewardsToDelete.length} rewards to delete out of ${rewards.length} rewards (some of them are referenced by partner groups or program enrollments).`,
  );

  if (rewardsToDelete.length === 0) {
    return logAndRespond("No rewards to delete, skipping...");
  }

  const deletedRewards = await prisma.reward.deleteMany({
    where: {
      id: {
        in: rewardsToDelete.map((reward) => reward.id),
      },
    },
  });

  return logAndRespond(
    `Finished deleting orphaned rewards (${deletedRewards.count} rewards deleted).`,
  );
});
