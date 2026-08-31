import { logger, toErrorFields } from "@/lib/axiom/server";
import { Job, Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { MAX_JOB_ATTEMPTS, MAX_JOBS_PER_BATCH } from "./constants";
import { isDefineJobName, sendJobs } from "./send-jobs";
import { isWorkflowName, triggerWorkflows } from "./send-workflows";
import type { PersistableJob, PublishResult } from "./types";

type JobTransport = {
  matches: (name: string) => boolean;
  send: (jobs: Job[]) => Promise<PublishResult[]>;
};

const transports: JobTransport[] = [
  {
    matches: isWorkflowName,
    send: triggerWorkflows,
  },
  {
    matches: isDefineJobName,
    send: sendJobs,
  },
];

// Persist jobs that failed to publish. Swallow DB errors (log only)
export async function persistFailedJobs({
  jobs,
  failedResults,
  logEvent = "jobs.dispatch_lost",
}: {
  jobs: PersistableJob[];
  failedResults: PublishResult[];
  logEvent?: string;
}) {
  if (failedResults.length === 0) {
    return;
  }

  const failedById = new Map(
    failedResults.map((result) => [result.id, result]),
  );

  const data = jobs
    .filter((job) => failedById.has(job.id))
    .map((job) => {
      const failed = failedById.get(job.id)!;

      return {
        id: job.id,
        name: job.name,
        payload: job.payload as Prisma.InputJsonValue,
        options: (job.options ?? {}) as Prisma.InputJsonValue,
        scheduledAt: job.scheduledAt ?? new Date(),
        lastError: failed.lastError,
        attempts: 1,
      };
    });

  try {
    await prisma.job.createMany({
      skipDuplicates: true,
      data,
    });
  } catch (error) {
    logger.error(logEvent, {
      jobCount: data.length,
      error: toErrorFields(error),
    });
    await logger.flush();
  }
}

// Delete successfully republished rows; bump attempts on failures.
export async function settlePublishResults({
  results,
  jobs,
}: {
  results: PublishResult[];
  jobs: Pick<Job, "id" | "name" | "attempts">[];
}) {
  const publishedIds = results
    .filter((result) => result.status === "published")
    .map((result) => result.id);

  const failedResults = results.filter((result) => result.status === "failed");

  if (publishedIds.length > 0) {
    await prisma.job.deleteMany({
      where: {
        id: {
          in: publishedIds,
        },
      },
    });
  }

  if (failedResults.length === 0) {
    return {
      published: publishedIds.length,
      failed: 0,
    };
  }

  const byError = new Map<string, string[]>();

  for (const result of failedResults) {
    const key = result.lastError ?? "";
    const ids = byError.get(key) ?? [];
    ids.push(result.id);
    byError.set(key, ids);
  }

  await Promise.all(
    Array.from(byError.entries()).map(([lastError, ids]) =>
      prisma.job.updateMany({
        where: {
          id: {
            in: ids,
          },
        },
        data: {
          lastError,
          attempts: {
            increment: 1,
          },
        },
      }),
    ),
  );

  const failedIds = new Set(failedResults.map((result) => result.id));

  const exhaustedJobs = jobs.filter(
    (job) => failedIds.has(job.id) && job.attempts + 1 >= MAX_JOB_ATTEMPTS,
  );

  if (exhaustedJobs.length > 0) {
    logger.error("jobs.retry_exhausted", {
      jobs: exhaustedJobs.map(({ id, name }) => ({ id, name })),
    });
    await logger.flush();
  }

  return {
    published: publishedIds.length,
    failed: failedResults.length,
  };
}

// Select due rows once (indexed), send via matching transport, then settle.
export async function publishPendingJobs(): Promise<{
  attempted: number;
  published: number;
  failed: number;
}> {
  const jobs = await prisma.job.findMany({
    where: {
      scheduledAt: {
        lte: new Date(),
      },
      attempts: {
        lt: MAX_JOB_ATTEMPTS,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: MAX_JOBS_PER_BATCH,
  });

  if (jobs.length === 0) {
    return {
      attempted: 0,
      published: 0,
      failed: 0,
    };
  }

  const matched = new Set<string>();
  const pending: Promise<PublishResult[]>[] = [];

  for (const transport of transports) {
    const batch = jobs.filter((job) => transport.matches(job.name));

    for (const job of batch) {
      matched.add(job.id);
    }

    pending.push(transport.send(batch));
  }

  const results = (await Promise.all(pending)).flat();

  for (const job of jobs) {
    if (matched.has(job.id)) {
      continue;
    }

    logger.error("jobs.unknown_kind", { id: job.id, name: job.name });
    results.push({
      id: job.id,
      status: "failed",
      lastError: `Unknown job kind: ${job.name}`,
    });
  }

  if (matched.size < jobs.length) {
    await logger.flush();
  }

  const settled = await settlePublishResults({ results, jobs });

  return {
    attempted: jobs.length,
    published: settled.published,
    failed: settled.failed,
  };
}
