import { logger } from "@/lib/axiom/server";
import { pluck } from "@dub/utils";
import { JobStatus, Prisma } from "@prisma/client";
import { createId } from "../api/create-id";
import { prisma } from "../prisma";
import { QStashJobPublisher } from "./publishers/qstash-job-publisher";
import { QStashWorkflowPublisher } from "./publishers/qstash-workflow-publisher";
import type { QStashJobOptions } from "./publishers/types";

const MAX_ATTEMPTS = 10;
const BATCH_SIZE = 100;

type DispatchJobInput = {
  name: string;
  payload: unknown;
  options?: QStashJobOptions;
};

export type PublishPendingJobsResult = {
  attempted: number;
  published: number;
  failed: number;
};

const qstashJobPublisher = new QStashJobPublisher();
const qstashWorkflowPublisher = new QStashWorkflowPublisher();

export async function dispatchJobs(
  input: DispatchJobInput | DispatchJobInput[],
) {
  const jobs = Array.isArray(input) ? input : [input];

  if (jobs.length === 0) {
    return;
  }

  const data = jobs.map((job) => ({
    id: createId({ prefix: "job_" }),
    name: job.name,
    scheduledAt: new Date(),
    payload: job.payload as Prisma.InputJsonValue,
    ...(job.options && {
      options: job.options as Prisma.InputJsonValue,
    }),
  }));

  // Durably persist the jobs in the database
  await prisma.job.createMany({
    skipDuplicates: true,
    data: data,
  });

  const jobIds = pluck(data, "id");

  // Best effort publish, if the job is not published, it will be published on the next cron run
  await publishPendingJobs(jobIds);
}

export async function publishPendingJobs(
  jobIds?: string[],
): Promise<PublishPendingJobsResult> {
  const emptyResult: PublishPendingJobsResult = {
    attempted: 0,
    published: 0,
    failed: 0,
  };

  if (jobIds && jobIds.length === 0) {
    return emptyResult;
  }

  const isScanMode = jobIds === undefined;

  const jobs = await prisma.job.findMany({
    where: {
      ...(jobIds && {
        id: {
          in: jobIds,
        },
      }),
      scheduledAt: {
        lte: new Date(),
      },
      status: {
        in: [JobStatus.pending, JobStatus.failed],
      },
      attempts: {
        lt: MAX_ATTEMPTS,
      },
    },
    ...(isScanMode && {
      orderBy: {
        createdAt: "asc" as const,
      },
      take: BATCH_SIZE,
    }),
  });

  if (jobs.length === 0) {
    return emptyResult;
  }

  const workflowJobs = jobs.filter(QStashWorkflowPublisher.isWorkflowJob);
  const qstashJobs = jobs.filter(
    (job) => !QStashWorkflowPublisher.isWorkflowJob(job),
  );

  const results = (
    await Promise.all([
      qstashWorkflowPublisher.send(workflowJobs),
      qstashJobPublisher.send(qstashJobs),
    ])
  ).flat();

  const publishedIds = results
    .filter((result) => result.status === JobStatus.published)
    .map((result) => result.id);

  const failedResults = results.filter(
    (result) => result.status === JobStatus.failed,
  );

  // Job has been published successfully
  if (publishedIds.length > 0) {
    await prisma.job.updateMany({
      where: {
        id: {
          in: publishedIds,
        },
      },
      data: {
        status: JobStatus.published,
      },
    });
  }

  // Job has failed
  if (failedResults.length > 0) {
    await Promise.all(
      failedResults.map((result) =>
        prisma.job.update({
          where: {
            id: result.id,
          },
          data: {
            status: JobStatus.failed,
            lastError: result.lastError,
            attempts: {
              increment: 1,
            },
          },
        }),
      ),
    );

    // Jobs that just ran out of attempts are excluded from future runs by the
    // MAX_ATTEMPTS filter and need manual intervention
    const exhaustedJobs = jobs.filter(
      (job) =>
        failedResults.some((result) => result.id === job.id) &&
        job.attempts + 1 >= MAX_ATTEMPTS,
    );

    if (exhaustedJobs.length > 0) {
      logger.error("jobs.retry_exhausted", {
        jobs: exhaustedJobs.map(({ id, name }) => ({ id, name })),
      });
      await logger.flush();
    }
  }

  return {
    attempted: jobs.length,
    published: publishedIds.length,
    failed: failedResults.length,
  };
}
