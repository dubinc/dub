import { createId } from "@/lib/api/create-id";
import { logger } from "@/lib/axiom/server";
import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
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

interface DispatchJobInput {
  name: string;
  payload: unknown;
  options?: JobDispatchOptions;
}

export const JOBS_ENDPOINT_URL = `${APP_DOMAIN_WITH_NGROK}/api/jobs/process`;

export function getJobsEndpointUrl(name: string) {
  return `${JOBS_ENDPOINT_URL}/${name}`;
}

const QSTASH_PUBLISH_MAX_RETRIES = 3;

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

    // TODO
    // Support dispatching multiple jobs at once dispatchBatch
  };
}

export type JobDefinition = ReturnType<typeof defineJob<z.ZodType>>;
