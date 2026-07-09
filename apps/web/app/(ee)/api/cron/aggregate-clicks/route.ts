import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK, chunk } from "@dub/utils";
import { EventType } from "@prisma/client";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

// This route is used aggregate clicks events on daily basis for Program links and add to the Commission table
// Runs every day at 00:00 (0 0 * * *)
// POST /api/cron/aggregate-clicks
export const POST = withCron(async () => {
  const clickRewards = await prisma.reward.findMany({
    where: {
      event: EventType.click,
      clickEnrollments: {
        some: {},
      },
      programId: {
        not: null,
      },
    },
    select: {
      id: true,
    },
  });

  if (clickRewards.length === 0) {
    return logAndRespond("No click rewards found. Skipping...");
  }

  const now = new Date();

  // set 'start' to the beginning of the previous day (00:00:00)
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 1);
  startDate.setHours(0, 0, 0, 0);

  // set 'end' to the end of the previous day (23:59:59)
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() - 1);
  endDate.setHours(23, 59, 59, 999);

  for (const clickRewardsChunk of chunk(clickRewards, 50)) {
    await enqueueBatchJobs(
      clickRewardsChunk.map((clickReward) => ({
        queueName: "aggregate-clicks",
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/aggregate-clicks/process`,
        deduplicationId: `aggregate-clicks-${clickReward.id}`,
        body: {
          clickRewardId: clickReward.id,
          startDate,
          endDate,
        },
      })),
    );
  }

  return logAndRespond(
    `Enqueued aggregate clicks jobs for ${clickRewards.length} click rewards.`,
  );
});
