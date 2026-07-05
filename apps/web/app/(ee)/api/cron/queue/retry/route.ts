import { logger } from "@/lib/axiom/server";
import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { buildReplayRequest } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash/redis";
import { logAndRespond } from "../../utils";

const MAX_ATTEMPTS = 10;
const BATCH_SIZE = 100;

const LOCK_KEY = "lock:queue-retry";
const LOCK_TTL_SECONDS = 120;

// GET /api/cron/queue/retry – republish background jobs that failed to
// publish to QStash at dispatch time; rows are deleted on successful publish
export const GET = withCron(async () => {
  const acquired = await redis.set(LOCK_KEY, "1", {
    nx: true,
    ex: LOCK_TTL_SECONDS,
  });

  if (!acquired) {
    return logAndRespond(
      "[queue-retry] Another run is in progress. Skipping...",
    );
  }

  try {
    const jobs = await prisma.job.findMany({
      where: {
        attempts: {
          lt: MAX_ATTEMPTS,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: BATCH_SIZE,
    });

    if (jobs.length === 0) {
      return logAndRespond("No background jobs to retry.");
    }

    const now = new Date();

    const entries = jobs.map((job) => buildReplayRequest(job, now));

    const jobIds = jobs.map(({ id }) => id);

    try {
      await qstash.batchJSON(entries);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await prisma.job.updateMany({
        where: {
          id: {
            in: jobIds,
          },
        },
        data: {
          attempts: {
            increment: 1,
          },
          lastError: errorMessage.slice(0, 1000),
        },
      });

      logger.error("jobs.retry_failed", {
        jobCount: jobs.length,
        errorMessage,
      });

      // Jobs that just ran out of attempts are excluded from future runs by the
      // MAX_ATTEMPTS filter and need manual intervention
      const exhaustedJobs = jobs.filter(
        (backgroundJob) => backgroundJob.attempts + 1 >= MAX_ATTEMPTS,
      );

      if (exhaustedJobs.length > 0) {
        logger.error("jobs.retry_exhausted", {
          jobs: exhaustedJobs.map(({ id, name }) => ({ id, name })),
        });
      }

      await logger.flush();

      return logAndRespond(
        `Failed to republish ${jobs.length} background jobs to QStash.`,
      );
    }

    await prisma.job.deleteMany({
      where: {
        id: {
          in: jobIds,
        },
      },
    });

    return logAndRespond(
      `Republished ${jobs.length} background jobs to QStash.`,
    );
  } finally {
    await redis.del(LOCK_KEY);
  }
});
