import { logger } from "@/lib/axiom/server";
import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import {
  buildJobLabel,
  getJobsEndpointUrl,
  JobDispatchOptions,
  JobEnvelope,
} from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { logAndRespond } from "../../utils";

const MAX_ATTEMPTS = 10;
const BATCH_SIZE = 50;

type JobReplayOptions = Pick<
  JobDispatchOptions,
  "deduplicationId" | "retries" | "queue" | "flowControl" | "label"
>;

// GET /api/cron/queue/retry – republish background jobs that failed to
// publish to QStash at dispatch time; rows are deleted on successful publish
export const GET = withCron(async () => {
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

  const entries = jobs.map((job) => {
    const options = (job.options ?? {}) as JobReplayOptions;

    const envelope: JobEnvelope = {
      name: job.name,
      payload: job.payload,
      dispatchedAt: job.createdAt.toISOString(),
    };

    return {
      url: getJobsEndpointUrl(job.name),
      body: envelope,
      label: buildJobLabel(job.name, options.label),
      ...(options.deduplicationId && {
        deduplicationId: options.deduplicationId,
      }),
      ...(options.retries !== undefined && { retries: options.retries }),
      ...(options.queue && { queueName: options.queue }),
      ...(options.flowControl && { flowControl: options.flowControl }),
      // Republish immediately and let QStash hold the message until its
      // scheduled time, so the row leaves the table as fast as possible
      ...(job.scheduledFor &&
        job.scheduledFor > now && {
          notBefore: Math.floor(job.scheduledFor.getTime() / 1000),
        }),
    };
  });

  const jobIds = jobs.map(({ id }) => id);

  try {
    await qstash.batchJSON(entries);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

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

  return logAndRespond(`Republished ${jobs.length} background jobs to QStash.`);
});
