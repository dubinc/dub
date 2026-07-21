import { logger } from "@/lib/axiom/server";
import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { buildReplayRequest, isPublishSuccess } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash/redis";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 10;
const BATCH_SIZE = 100;

// Lock for the cron job. TTL must be ≥ cron maxDuration (600s in vercel.json)
// so the lock cannot expire while a run is still alive and allow a concurrent
// minute-cron invocation
const LOCK_KEY = "lock:queue-retry";
const LOCK_TTL_SECONDS = 600;

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
    let responses: unknown[];

    try {
      responses = await qstash.batchJSON(entries);
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

    const publishedJobIds: string[] = [];
    const failedJobs: typeof jobs = [];

    jobs.forEach((job, index) => {
      if (isPublishSuccess(responses[index])) {
        publishedJobIds.push(job.id);
      } else {
        failedJobs.push(job);
      }
    });

    if (publishedJobIds.length > 0) {
      await prisma.job.deleteMany({
        where: {
          id: {
            in: publishedJobIds,
          },
        },
      });
    }

    if (failedJobs.length === 0) {
      return logAndRespond(
        `Republished ${jobs.length} background jobs to QStash.`,
      );
    }

    const errorMessage = "QStash batch publish did not return a messageId";

    await prisma.job.updateMany({
      where: {
        id: {
          in: failedJobs.map(({ id }) => id),
        },
      },
      data: {
        attempts: {
          increment: 1,
        },
        lastError: errorMessage,
      },
    });

    logger.error("jobs.retry_failed", {
      jobCount: failedJobs.length,
      errorMessage,
    });

    // Jobs that just ran out of attempts are excluded from future runs by the
    // MAX_ATTEMPTS filter and need manual intervention
    const exhaustedJobs = failedJobs.filter(
      (backgroundJob) => backgroundJob.attempts + 1 >= MAX_ATTEMPTS,
    );

    if (exhaustedJobs.length > 0) {
      logger.error("jobs.retry_exhausted", {
        jobs: exhaustedJobs.map(({ id, name }) => ({ id, name })),
      });
    }

    await logger.flush();

    return logAndRespond(
      `Republished ${publishedJobIds.length} background jobs to QStash; failed to republish ${failedJobs.length}.`,
    );
  } finally {
    await redis.del(LOCK_KEY);
  }
});
