import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// GET /api/cron/bounties/queue-sync-social-metrics - queue social metrics sync for bounties
export const GET = withCron(async () => {
  const now = new Date();

  const bounties = await prisma.bounty.findMany({
    where: {
      type: "submission",
      startsAt: {
        lte: now,
      },
      OR: [
        {
          endsAt: null,
        },
        {
          endsAt: {
            gt: now,
          },
        },
      ],
      submissionRequirements: {
        path: "$.socialMetrics",
        not: Prisma.JsonNull,
      },
    },
    select: {
      id: true,
      submissionRequirements: true,
    },
  });

  if (bounties.length === 0) {
    return logAndRespond("No bounties to sync social metrics for.");
  }

  await enqueueBatchJobs(
    bounties.map((bounty) => ({
      queueName: "sync-bounty-social-metrics",
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/sync-social-metrics`,
      deduplicationId: bounty.id,
      body: {
        bountyId: bounty.id,
      },
    })),
  );

  return logAndRespond(
    `Queued ${bounties.length} bounties to sync social metrics.`,
  );
});
