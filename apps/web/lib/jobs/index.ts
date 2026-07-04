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

interface DispatchJobBatchInput {
  name: string;
  defaults?: JobDefaults;
  items: Array<{
    payload: unknown;
    options?: JobDispatchOptions;
  }>;
}

export const JOBS_ENDPOINT_URL = `${APP_DOMAIN_WITH_NGROK}/api/jobs/process`;

export function getJobsEndpointUrl(name: string) {
  return `${JOBS_ENDPOINT_URL}/${name}`;
}

const QSTASH_PUBLISH_MAX_RETRIES = 3;
const QSTASH_BATCH_CHUNK_SIZE = 100;

export const jobNameSchema = z
  .string()
  .regex(/^[a-z][a-zA-Z0-9]*$/, "Job name must be camelCase");

// QStash label: user-provided tag first, job name appended for log filtering
export function buildJobLabel(name: string, label?: string) {
  return label ? `${label},${name}` : name;
}

// Wire format published to QStash and consumed by /api/jobs/process/[jobName]
export const jobEnvelopeSchema = z.object({
  name: jobNameSchema,
  dispatchedAt: z.string(),
  payload: z.unknown(),
});

function buildPublishRequest({ name, payload, options }: DispatchJobInput) {
  const envelope: JobEnvelope = {
    name,
    payload,
    dispatchedAt: new Date().toISOString(),
  };

  return {
    url: getJobsEndpointUrl(name),
    body: envelope,
    label: buildJobLabel(name, options?.label),
    ...(options?.delay && { delay: options.delay }),
    ...(options?.notBefore && { notBefore: options.notBefore }),
    ...(options?.deduplicationId && {
      deduplicationId: options.deduplicationId,
    }),
    ...(options?.retries !== undefined && { retries: options.retries }),
    ...(options?.flowControl && { flowControl: options.flowControl }),
  };
}

function buildBatchPublishRequest(input: DispatchJobInput) {
  return {
    ...buildPublishRequest(input),
    ...(input.options?.queue && { queueName: input.options.queue }),
  };
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

async function publishJobToQStash(input: DispatchJobInput) {
  const { options } = input;
  const request = buildPublishRequest(input);

  for (let attempt = 0; attempt <= QSTASH_PUBLISH_MAX_RETRIES; attempt++) {
    try {
      if (options?.queue) {
        return await qstash
          .queue({ queueName: options.queue })
          .enqueueJSON(request);
      }

      return await qstash.publishJSON(request);
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

  throw new Error("Failed to publish job to QStash.");
}

async function publishJobsBatchToQStash(inputs: DispatchJobInput[]) {
  const requests = inputs.map((input) => buildBatchPublishRequest(input));

  for (let attempt = 0; attempt <= QSTASH_PUBLISH_MAX_RETRIES; attempt++) {
    try {
      return await qstash.batchJSON(requests);
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

  throw new Error("Failed to publish job batch to QStash.");
}

async function deferJobInputs(inputs: DispatchJobInput[]) {
  const backgroundJobs = await persistBackgroundJobs(inputs);

  return backgroundJobs.map((backgroundJob) => ({
    status: "deferred" as const,
    backgroundJobId: backgroundJob.id,
  }));
}

async function dispatchJobBatch({
  name,
  defaults,
  items,
}: DispatchJobBatchInput): Promise<DispatchBatchResult> {
  if (items.length === 0) {
    return {
      published: 0,
      deferred: 0,
      failed: 0,
      results: [],
    };
  }

  const inputs: DispatchJobInput[] = items.map(({ payload, options }) => ({
    name,
    payload,
    options: { ...defaults, ...options },
  }));

  const results: DispatchResult[] = [];
  let published = 0;
  let deferred = 0;
  let failed = 0;

  for (const inputChunk of chunk(inputs, QSTASH_BATCH_CHUNK_SIZE)) {
    try {
      const responses = await publishJobsBatchToQStash(inputChunk);
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
          continue;
        }

        failedInputs.push(input);
      }

      if (failedInputs.length > 0) {
        logger.error("jobs.publish_failed", {
          jobName: name,
          jobCount: failedInputs.length,
          batch: true,
        });

        for (const input of failedInputs) {
          const label = buildJobLabel(name, input.options?.label);

          try {
            const [backgroundJob] = await persistBackgroundJobs([input]);
            deferred++;
            results.push({
              status: "deferred",
              backgroundJobId: backgroundJob.id,
            });
          } catch (error) {
            logger.error("jobs.dispatch_lost", {
              jobName: name,
              label,
              errorName: error instanceof Error ? error.name : undefined,
              errorMessage:
                error instanceof Error ? error.message : String(error),
            });
            failed++;
          }
        }
      }

      console.log(`[jobs:${name}] batch published`, {
        jobName: name,
        chunkSize: inputChunk.length,
        published: inputChunk.length - failedInputs.length,
        deferred: failedInputs.length,
      });
    } catch (error) {
      logger.error("jobs.publish_failed", {
        jobName: name,
        jobCount: inputChunk.length,
        batch: true,
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      try {
        const deferredResults = await deferJobInputs(inputChunk);
        deferred += deferredResults.length;
        results.push(...deferredResults);
      } catch (persistError) {
        logger.error("jobs.dispatch_lost", {
          jobName: name,
          jobCount: inputChunk.length,
          errorName:
            persistError instanceof Error ? persistError.name : undefined,
          errorMessage:
            persistError instanceof Error
              ? persistError.message
              : String(persistError),
        });

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

// Dispatch a single job
async function dispatchJob(input: DispatchJobInput): Promise<DispatchResult> {
  const { name, options } = input;
  const label = buildJobLabel(name, options?.label);

  try {
    const response = await publishJobToQStash(input);

    console.log(`[jobs:${name}] published`, {
      jobName: name,
      label,
      messageId: response.messageId,
      queue: options?.queue,
      delay: options?.delay,
      notBefore: options?.notBefore,
    });

    return {
      status: "published",
      messageId: response.messageId,
    };
  } catch (error) {
    logger.error("jobs.publish_failed", {
      jobName: name,
      label,
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    try {
      const [backgroundJob] = await persistBackgroundJobs([input]);

      await logger.flush();

      return {
        status: "deferred",
        backgroundJobId: backgroundJob.id,
      };
    } catch (error) {
      logger.error("jobs.dispatch_lost", {
        jobName: name,
        label,
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      await logger.flush();

      throw error;
    }
  }
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

    dispatch: (payload: z.infer<TSchema>, options?: JobDispatchOptions) =>
      dispatchJob({
        name,
        payload,
        options: { ...defaults, ...options },
      }),

    dispatchBatch: (
      payloads: z.infer<TSchema>[],
      getOptions?: (
        payload: z.infer<TSchema>,
        index: number,
      ) => JobDispatchOptions | undefined,
    ) =>
      dispatchJobBatch({
        name,
        defaults,
        items: payloads.map((payload, index) => ({
          payload,
          options: getOptions?.(payload, index),
        })),
      }),
  };
}

export type JobDefinition = ReturnType<typeof defineJob<z.ZodType>>;
