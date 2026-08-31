import { createId } from "@/lib/api/create-id";
import { logger } from "@/lib/axiom/server";
import { APP_DOMAIN_WITH_NGROK, chunk, serializeError } from "@dub/utils";
import { Job, JobStatus, Prisma } from "@prisma/client";
import { PublishRequest } from "@upstash/qstash";
import { Client, TriggerOptions } from "@upstash/workflow";
import { prisma } from "../prisma";
import {
  LAST_ERROR_MAX_LENGTH,
  MAX_JOB_ATTEMPTS,
  MAX_JOBS_PER_BATCH,
  QSTASH_BATCH_CHUNK_SIZE,
} from "./constants";

const workflowClient = new Client({
  baseUrl: process.env.QSTASH_URL || "https://qstash-us-east-1.upstash.io",
  token: process.env.QSTASH_TOKEN || "",
  ...(process.env.VERCEL_ENV === "preview" && {
    headers: {
      "x-vercel-protection-bypass":
        process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "",
    },
  }),
});

const workflowPathMap = {
  partnerApproved: "/api/workflows/partner-approved",
  mergePartnerAccounts: "/api/workflows/merge-partner-accounts",
  createPartnerCommission: "/api/workflows/create-partner-commission",
} as const;

export type WorkflowName = keyof typeof workflowPathMap;

const WORKFLOW_NAMES = Object.keys(workflowPathMap) as WorkflowName[];

type WorkflowOptions = Pick<
  PublishRequest,
  "label" | "deduplicationId" | "retries" | "flowControl"
>;

type DispatchWorkflowInput = {
  name: WorkflowName;
  payload: unknown;
  options?: WorkflowOptions;
};

type WorkflowRecord = {
  id: string;
  name: WorkflowName;
  payload: unknown;
  options: WorkflowOptions;
  createdAt?: Date;
};

type PublishResult = {
  id: string;
  status: typeof JobStatus.published | typeof JobStatus.failed;
  lastError: string | null;
  workflowRunId?: string;
};

export type DispatchWorkflowsResult = {
  published: number;
  failed: number;
  results: PublishResult[];
};

export type PublishPendingWorkflowsResult = {
  attempted: number;
  published: number;
  failed: number;
};

function toErrorFields(error: unknown) {
  return {
    errorName: error instanceof Error ? error.name : undefined,
    errorMessage: error instanceof Error ? error.message : String(error),
  };
}

function isTriggerSuccess(
  response: unknown,
): response is { workflowRunId: string } {
  return (
    typeof response === "object" &&
    response !== null &&
    "workflowRunId" in response &&
    typeof response.workflowRunId === "string"
  );
}

function buildTriggerRequest(job: WorkflowRecord): TriggerOptions {
  const workflowPath = workflowPathMap[job.name];
  const workflowKey = workflowPath.split("/").pop()!;

  return {
    url: `${APP_DOMAIN_WITH_NGROK}${workflowPath}`,
    body: job.payload,
    workflowRunId: job.options.deduplicationId ?? job.id,
    retries: job.options.retries ?? 5,
    flowControl: job.options.flowControl ?? {
      key: workflowKey,
      parallelism: 15,
    },
    ...(job.options.label && { label: job.options.label }),
  };
}

async function triggerWorkflows(
  jobs: WorkflowRecord[],
): Promise<PublishResult[]> {
  if (jobs.length === 0) {
    return [];
  }

  const results: PublishResult[] = [];

  for (const jobChunk of chunk(jobs, QSTASH_BATCH_CHUNK_SIZE)) {
    try {
      const responses = await workflowClient.trigger(
        jobChunk.map((job) => buildTriggerRequest(job)),
      );

      jobChunk.forEach((job, index) => {
        const response = responses[index];

        if (isTriggerSuccess(response)) {
          results.push({
            id: job.id,
            status: JobStatus.published,
            lastError: null,
            workflowRunId: response.workflowRunId,
          });
        } else {
          results.push({
            id: job.id,
            status: JobStatus.failed,
            lastError: "Workflow trigger did not return a workflowRunId",
          });
        }
      });
    } catch (error) {
      const lastError = serializeError(error).slice(0, LAST_ERROR_MAX_LENGTH);

      logger.error("workflows.publish_failed", {
        jobCount: jobChunk.length,
        ...toErrorFields(error),
      });

      for (const job of jobChunk) {
        results.push({
          id: job.id,
          status: JobStatus.failed,
          lastError,
        });
      }
    }
  }

  await logger.flush();

  return results;
}

async function persistFailedWorkflows({
  jobs,
  failedResults,
}: {
  jobs: WorkflowRecord[];
  failedResults: PublishResult[];
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
        options: job.options as Prisma.InputJsonValue,
        scheduledAt: new Date(),
        status: JobStatus.failed,
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
    logger.error("workflows.dispatch_lost", {
      jobCount: data.length,
      ...toErrorFields(error),
    });
    await logger.flush();
  }
}

async function deletePublishedWorkflows(publishedResults: PublishResult[]) {
  if (publishedResults.length === 0) {
    return;
  }

  await prisma.job.deleteMany({
    where: {
      id: {
        in: publishedResults.map((result) => result.id),
      },
    },
  });
}

async function markWorkflowsAsFailed({
  failedResults,
  jobs,
}: {
  failedResults: PublishResult[];
  jobs: Pick<Job, "id" | "name" | "attempts">[];
}) {
  if (failedResults.length === 0) {
    return;
  }

  const byError = new Map<string, string[]>();

  for (const result of failedResults) {
    const key = result.lastError ?? "";
    const ids = byError.get(key) ?? [];
    ids.push(result.id);
    byError.set(key, ids);
  }

  await Promise.all(
    [...byError.entries()].map(([lastError, ids]) =>
      prisma.job.updateMany({
        where: {
          id: {
            in: ids,
          },
        },
        data: {
          status: JobStatus.failed,
          lastError,
          attempts: {
            increment: 1,
          },
        },
      }),
    ),
  );

  const exhaustedJobs = jobs.filter(
    (job) =>
      failedResults.some((result) => result.id === job.id) &&
      job.attempts + 1 >= MAX_JOB_ATTEMPTS,
  );

  if (exhaustedJobs.length > 0) {
    for (const { id, name } of exhaustedJobs) {
      logger.error("workflows.retry_exhausted", { id, name });
    }

    await logger.flush();
  }
}

/** Publish workflows to QStash; persist only on failure for the retry cron. */
export async function dispatchWorkflows(
  input: DispatchWorkflowInput | DispatchWorkflowInput[],
): Promise<DispatchWorkflowsResult> {
  const inputs = Array.isArray(input) ? input : [input];

  if (inputs.length === 0) {
    return {
      published: 0,
      failed: 0,
      results: [],
    };
  }

  const jobs: WorkflowRecord[] = inputs.map((job) => {
    const id = createId({ prefix: "job_" });

    return {
      id,
      name: job.name,
      payload: job.payload,
      // Default deduplicationId to the job id so inline publish and the
      // retry cron cannot deliver the same workflow twice
      options: {
        ...job.options,
        deduplicationId: job.options?.deduplicationId ?? id,
      },
    };
  });

  const results = await triggerWorkflows(jobs);

  const publishedResults = results.filter(
    (result) => result.status === JobStatus.published,
  );
  const failedResults = results.filter(
    (result) => result.status === JobStatus.failed,
  );

  await persistFailedWorkflows({ jobs, failedResults });

  return {
    published: publishedResults.length,
    failed: failedResults.length,
    results,
  };
}

/** Republish deferred workflows that failed to publish at dispatch time. */
export async function publishPendingWorkflows(): Promise<PublishPendingWorkflowsResult> {
  const emptyResult: PublishPendingWorkflowsResult = {
    attempted: 0,
    published: 0,
    failed: 0,
  };

  const jobs = await prisma.job.findMany({
    where: {
      name: {
        in: WORKFLOW_NAMES,
      },
      scheduledAt: {
        lte: new Date(),
      },
      status: {
        in: [JobStatus.pending, JobStatus.failed],
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
    return emptyResult;
  }

  const workflowJobs: WorkflowRecord[] = jobs.map((job) => ({
    id: job.id,
    name: job.name as WorkflowName,
    payload: job.payload,
    options: (job.options ?? {}) as WorkflowOptions,
    createdAt: job.createdAt,
  }));

  const results = await triggerWorkflows(workflowJobs);

  const publishedResults = results.filter(
    (result) => result.status === JobStatus.published,
  );
  const failedResults = results.filter(
    (result) => result.status === JobStatus.failed,
  );

  await deletePublishedWorkflows(publishedResults);
  await markWorkflowsAsFailed({ failedResults, jobs });

  return {
    attempted: jobs.length,
    published: publishedResults.length,
    failed: failedResults.length,
  };
}
