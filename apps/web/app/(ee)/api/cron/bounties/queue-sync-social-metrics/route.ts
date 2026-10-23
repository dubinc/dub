import { buildBountyActivePeriodWhere } from "@/lib/bounty/api/bounty-availability";
import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK, chunk } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// GET /api/cron/bounties/queue-sync-social-metrics - queue social metrics sync for bounties
export const GET = withCron(async () => {
  const bounties = await prisma.bounty.findMany({
    where: {
      type: "submission",
      submissionRequirements: {
        path: "$.socialMetrics",
        not: Prisma.JsonNull,
      },
      ...buildBountyActivePeriodWhere(),
    },
    select: {
      id: true,
    },
  });

  if (bounties.length === 0) {
    return logAndRespond("No bounties to sync social metrics for.");
  }

  const chunks = chunk(bounties, 100);

  for (const chunk of chunks) {
    await enqueueBatchJobs(
      chunk.map((bounty) => ({
        queueName: "sync-bounty-social-metrics",
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/sync-social-metrics`,
        deduplicationId: bounty.id,
        body: {
          bountyId: bounty.id,
        },
      })),
    );
  }

  return logAndRespond(
    `Queued ${bounties.length} bounties to sync social metrics.`,
  );
});
