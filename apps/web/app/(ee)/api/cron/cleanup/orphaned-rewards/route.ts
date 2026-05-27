import { withCron } from "@/lib/cron/with-cron";
import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { subMinutes } from "date-fns";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// The rewards/process cron normally hard-deletes once enrollments are cleared, but a newer
// reward change for the same group + event type can bump the version and skip stale jobs
// (e.g. delete then create), leaving the old row behind. This job is a safety net for those orphans.

const REWARD_BATCH_SIZE = 10;

// GET /api/cron/cleanup/orphaned-rewards
export const GET = withCron(async () => {
  const rewards = await prisma.reward.findMany({
    where: {
      programId: null,
      updatedAt: {
        lt: subMinutes(new Date(), 30), // 30 minutes ago
      },
    },
    select: {
      id: true,
      event: true,
    },
    orderBy: {
      updatedAt: "asc",
    },
    take: REWARD_BATCH_SIZE,
  });

  if (rewards.length === 0) {
    return logAndRespond("No orphaned rewards found.");
  }

  for (const reward of rewards) {
    const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[reward.event];

    const [partnerGroupCount, programEnrollmentCount] = await Promise.all([
      prisma.partnerGroup.count({
        where: {
          [rewardIdColumn]: reward.id,
        },
      }),

      prisma.programEnrollment.count({
        where: {
          [rewardIdColumn]: reward.id,
        },
      }),
    ]);

    // Ideally this should never happen, but just in case
    if (partnerGroupCount > 0) {
      console.log(
        `Reward ${reward.id} is referenced by ${partnerGroupCount} partner groups. Skipping...`,
      );
      continue;
    }

    if (programEnrollmentCount > 0) {
      console.log(
        `Reward ${reward.id} is referenced by ${programEnrollmentCount} program enrollments. Skipping...`,
      );
      continue;
    }

    try {
      await prisma.reward.delete({
        where: {
          id: reward.id,
        },
      });

      console.log(`Deleted reward ${reward.id}.`);
    } catch (error) {
      console.error(`Error deleting reward ${reward.id}`, error);
    }
  }

  return logAndRespond("Finished deleting orphaned rewards.");
});
