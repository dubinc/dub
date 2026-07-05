import { createId } from "@/lib/api/create-id";
import { logger } from "@/lib/axiom/server";
import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK, chunk } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { PublishRequest } from "@upstash/qstash";
import * as z from "zod/v4";

export type JobEnvelope = z.infer<typeof jobEnvelopeSchema>;

type JobPublishOptions = Pick<
  PublishRequest,
  | "delay"
  | "notBefore"
  | "deduplicationId"
  | "retries"
  | "flowControl"
  | "label"
>;

export type JobDispatchOptions = JobPublishOptions & {
  queue?: string;
};

// Per-job defaults, merged under per-dispatch options
export type JobDefaults = Pick<
  JobDispatchOptions,
  "retries" | "queue" | "flowControl" | "label"
>;

export type DispatchResult =
  | { status: "published"; messageId: string }
  | { status: "deferred"; backgroundJobId: string };

export type DispatchBatchResult = {
  published: number;
  deferred: number;
  failed: number;
  results: DispatchResult[];
};

interface DispatchJobInput {
  name: string;
  payload: unknown;
  options?: JobDispatchOptions;
}

type JobReplayOptions = Pick<
  JobDispatchOptions,
  "deduplicationId" | "retries" | "queue" | "flowControl" | "label"
>;

const JOBS_ENDPOINT_URL = `${APP_DOMAIN_WITH_NGROK}/api/jobs/process`;

const QSTASH_PUBLISH_MAX_RETRIES = 3;

const QSTASH_BATCH_CHUNK_SIZE = 100;

export const jobNameSchema = z
  .string()
  .regex(/^[a-z][a-zA-Z0-9]*$/, "Job name must be camelCase");

export function getJobsEndpointUrl(name: string) {
  return `${JOBS_ENDPOINT_URL}/${name}`;
}

// QStash label: user-provided tag first, job name appended for log filtering
export function buildJobLabel(name: string, label?: string) {
  return label ? `${label},${name}` : name;
}

// QStash deduplicationId: user-provided id first, job name appended for cross-job isolation
export function buildJobDeduplicationId(
  name: string,
  deduplicationId?: string,
) {
  if (!deduplicationId) {
    return undefined;
  }

  return `${deduplicationId},${name}`;
}

// Wire format published to QStash and consumed by /api/jobs/process/[jobName]
export const jobEnvelopeSchema = z.object({
  name: jobNameSchema,
  dispatchedAt: z.string(),
  payload: z.unknown(),
});

function toErrorFields(error: unknown) {
  return {
    errorName: error instanceof Error ? error.name : undefined,
    errorMessage: error instanceof Error ? error.message : String(error),
  };
}

async function withQStashRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= QSTASH_PUBLISH_MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt < QSTASH_PUBLISH_MAX_RETRIES) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt)),
        );
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to publish to QStash.");
}

function buildQStashJobRequest(
  { name, payload, options }: DispatchJobInput,
  opts?: {
    dispatchedAt?: string;
    batch?: boolean;
    notBefore?: number;
  },
) {
  const envelope: JobEnvelope = {
    name,
    payload,
    dispatchedAt: opts?.dispatchedAt ?? new Date().toISOString(),
  };

  const notBefore = opts?.notBefore ?? options?.notBefore;
  const deduplicationId = buildJobDeduplicationId(
    name,
    options?.deduplicationId,
  );

  return {
    url: getJobsEndpointUrl(name),
    body: envelope,
    label: buildJobLabel(name, options?.label),
    ...(options?.delay &&
      opts?.notBefore === undefined && {
        delay: options.delay,
      }),
    ...(notBefore && { notBefore }),
    ...(deduplicationId && { deduplicationId }),
    ...(options?.retries !== undefined && { retries: options.retries }),
    ...(options?.flowControl && { flowControl: options.flowControl }),
    ...(opts?.batch && options?.queue && { queueName: options.queue }),
  };
}

export function buildReplayRequest(
  job: {
    name: string;
    payload: Prisma.JsonValue;
    options: Prisma.JsonValue | null;
    createdAt: Date;
    scheduledFor: Date | null;
  },
  now: Date = new Date(),
) {
  const options = (job.options ?? {}) as JobReplayOptions;

  const notBefore =
    job.scheduledFor && job.scheduledFor > now
      ? Math.floor(job.scheduledFor.getTime() / 1000)
      : undefined;

  return buildQStashJobRequest(
    {
      name: job.name,
      payload: job.payload,
      options,
    },
    {
      dispatchedAt: job.createdAt.toISOString(),
      batch: true,
      notBefore,
    },
  );
}

function isPublishSuccess(
  response: unknown,
): response is { messageId: string } {
  return (
    typeof response === "object" &&
    response !== null &&
    "messageId" in response &&
    typeof response.messageId === "string"
  );
}

// Persist jobs that could not be published to QStash. The
// /api/cron/queue/retry cron republishes them and deletes the rows on success.
async function persistBackgroundJobs(inputs: DispatchJobInput[]) {
  const jobs = inputs.map(({ name, payload, options }) => {
    let scheduledFor: Date | null = null;

    if (options?.notBefore) {
      scheduledFor = new Date(options.notBefore * 1000);
    } else if (typeof options?.delay === "number") {
      scheduledFor = new Date(Date.now() + options.delay * 1000);
    }

    const replayOptions = {
      ...(options?.deduplicationId && {
        deduplicationId: options.deduplicationId,
      }),
      ...(options?.retries !== undefined && { retries: options.retries }),
      ...(options?.queue && { queue: options.queue }),
      ...(options?.flowControl && { flowControl: options.flowControl }),
      ...(options?.label && { label: options.label }),
    };

    return {
      id: createId({ prefix: "job_" }),
      name,
      payload: payload as Prisma.InputJsonValue,
      options: replayOptions as Prisma.InputJsonValue,
      scheduledFor,
    };
  });

  await prisma.job.createMany({
    data: jobs,
  });

  return jobs;
}

async function deferJobs(inputs: DispatchJobInput[]) {
  const backgroundJobs = await persistBackgroundJobs(inputs);

  return backgroundJobs.map((backgroundJob) => ({
    status: "deferred" as const,
    backgroundJobId: backgroundJob.id,
  }));
}

async function publishJobsToQStash(inputs: DispatchJobInput[]) {
  if (inputs.length === 0) {
    return [];
  }

  if (inputs.length === 1) {
    const input = inputs[0];
    const request = buildQStashJobRequest(input);

    const response = await withQStashRetry(async () => {
      if (input.options?.queue) {
        return qstash
          .queue({ queueName: input.options.queue })
          .enqueueJSON(request);
      }

      return qstash.publishJSON(request);
    });

    return [response];
  }

  const requests = inputs.map((input) =>
    buildQStashJobRequest(input, { batch: true }),
  );

  return withQStashRetry(() => qstash.batchJSON(requests));
}

async function dispatchJobs(
  inputs: DispatchJobInput[],
): Promise<DispatchBatchResult> {
  if (inputs.length === 0) {
    return {
      published: 0,
      deferred: 0,
      failed: 0,
      results: [],
    };
  }

  const results: DispatchResult[] = [];
  let published = 0;
  let deferred = 0;
  let failed = 0;
  const isSingleDispatch = inputs.length === 1;

  for (const inputChunk of chunk(inputs, QSTASH_BATCH_CHUNK_SIZE)) {
    const jobName = inputChunk[0].name;

    try {
      const responses = await publishJobsToQStash(inputChunk);
      const failedInputs: DispatchJobInput[] = [];

      for (let index = 0; index < inputChunk.length; index++) {
        const input = inputChunk[index];
        const response = responses[index];

        if (isPublishSuccess(response)) {
          published++;
          results.push({
            status: "published",
            messageId: response.messageId,
          });

          if (isSingleDispatch) {
            console.log(`[jobs:${input.name}] published`, {
              jobName: input.name,
              label: buildJobLabel(input.name, input.options?.label),
              messageId: response.messageId,
              queue: input.options?.queue,
              delay: input.options?.delay,
              notBefore: input.options?.notBefore,
            });
          }

          continue;
        }

        failedInputs.push(input);
      }

      if (failedInputs.length > 0) {
        logger.error("jobs.publish_failed", {
          jobName,
          jobCount: failedInputs.length,
          batch: !isSingleDispatch,
        });

        try {
          const deferredResults = await deferJobs(failedInputs);
          deferred += deferredResults.length;
          results.push(...deferredResults);
        } catch (error) {
          logger.error("jobs.dispatch_lost", {
            jobName,
            jobCount: failedInputs.length,
            ...toErrorFields(error),
          });

          failed += failedInputs.length;
          await logger.flush();
          throw error;
        }
      }

      if (!isSingleDispatch) {
        console.log(`[jobs:${jobName}] batch published`, {
          jobName,
          chunkSize: inputChunk.length,
          published: inputChunk.length - failedInputs.length,
          deferred: failedInputs.length,
        });
      }
    } catch (error) {
      logger.error("jobs.publish_failed", {
        jobName,
        jobCount: inputChunk.length,
        batch: !isSingleDispatch,
        ...toErrorFields(error),
      });

      try {
        const deferredResults = await deferJobs(inputChunk);
        deferred += deferredResults.length;
        results.push(...deferredResults);
      } catch (persistError) {
        logger.error("jobs.dispatch_lost", {
          jobName,
          jobCount: inputChunk.length,
          ...toErrorFields(persistError),
        });

        failed += inputChunk.length;
        await logger.flush();
        throw persistError;
      }
    }
  }

  await logger.flush();

  return {
    published,
    deferred,
    failed,
    results,
  };
}

export function defineJob<TSchema extends z.ZodType>({
  name,
  schema,
  defaults,
  handle,
}: {
  name: string;
  schema: TSchema;
  defaults?: JobDefaults;
  handle: (payload: z.infer<TSchema>) => Promise<void>;
}) {
  jobNameSchema.parse(name);

  return {
    name,

    execute: async (payload: unknown) => {
      const parsed = schema.parse(payload);
      await handle(parsed);
    },

    dispatch: async (
      payload: z.infer<TSchema>,
      options?: JobDispatchOptions,
    ) => {
      const { results } = await dispatchJobs([
        {
          name,
          payload,
          options: { ...defaults, ...options },
        },
      ]);
      return results[0];
    },

    dispatchBatch: (
      payloads: z.infer<TSchema>[],
      getOptions?: (
        payload: z.infer<TSchema>,
        index: number,
      ) => JobDispatchOptions | undefined,
    ) =>
      dispatchJobs(
        payloads.map((payload, index) => ({
          name,
          payload,
          options: { ...defaults, ...getOptions?.(payload, index) },
        })),
      ),
  };
}

export type JobDefinition = ReturnType<typeof defineJob<z.ZodType>>;
