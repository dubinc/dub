import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

// GET /api/cron/queue-sync-social-engagement
// Runs daily at 07:00 UTC. Queues one sync job per eligible partner platform.
export const GET = withCron(async () => {
  const partnerPlatforms = await prisma.partnerPlatform.findMany({
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
  });

  if (partnerPlatforms.length === 0) {
    return logAndRespond("No eligible partner platforms for engagement sync.");
  }

  const jobs = await enqueueBatchJobs(
    partnerPlatforms.map((pp) => ({
      queueName: "sync-social-engagement",
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/sync-social-engagement`,
      deduplicationId: pp.id,
      body: {
        partnerPlatformId: pp.id,
      },
    })),
  );

  return logAndRespond(`Queued ${jobs.length} social engagement sync jobs.`);
});
