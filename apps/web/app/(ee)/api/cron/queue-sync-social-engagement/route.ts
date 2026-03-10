import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 100;

// GET /api/cron/queue-sync-social-engagement
// Runs daily at 07:00 UTC. Queues one sync job per eligible partner platform.
export const GET = withCron(async () => {
  let cursor: string | undefined;
  let totalQueued = 0;

  while (true) {
    const batch = await prisma.partnerPlatform.findMany({
      where: {
        verifiedAt: {
          not: null,
        },
        platformId: {
          not: null,
        },
        type: {
          in: ["twitter", "youtube"],
        },
      },
      select: {
        id: true,
      },
      take: BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
      ...(cursor
        ? {
            cursor: {
              id: cursor,
            },
            skip: 1,
          }
        : {}),
    });

    if (batch.length === 0) {
      break;
    }

    const jobs = await enqueueBatchJobs(
      batch.map((pp) => ({
        queueName: "sync-social-engagement",
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/sync-social-engagement`,
        deduplicationId: pp.id,
        body: {
          partnerPlatformId: pp.id,
        },
      })),
    );

    totalQueued += jobs.length;

    if (batch.length < BATCH_SIZE) {
      break;
    }

    cursor = batch[batch.length - 1].id;
  }

  return logAndRespond(`Queued ${totalQueued} social engagement sync jobs.`);
});
