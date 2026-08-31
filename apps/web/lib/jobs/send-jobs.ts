import { logger } from "@/lib/axiom/server";
import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK, chunk } from "@dub/utils";
import { Job, Prisma } from "@prisma/client";
import { PublishRequest } from "@upstash/qstash";
import * as z from "zod/v4";
import { LAST_ERROR_MAX_LENGTH, QSTASH_BATCH_CHUNK_SIZE } from "./constants";
import type { PublishResult } from "./types";

export type JobDispatchOptions = Pick<
  PublishRequest,
  | "delay"
  | "notBefore"
  | "deduplicationId"
  | "retries"
  | "flowControl"
  | "label"
> & {
  queue?: string;
};

type JobReplayOptions = Pick<
  JobDispatchOptions,
  "deduplicationId" | "retries" | "queue" | "flowControl" | "label"
>;

type DispatchJobInput = {
  name: string;
  payload: unknown;
  options?: JobDispatchOptions;
};

const JOBS_ENDPOINT_URL = `${APP_DOMAIN_WITH_NGROK}/api/jobs/process`;

export const jobNameSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9]*(-[a-z0-9]+)*-job$/,
    'Job name must be kebab-case ending in "-job"',
  );

export const jobEnvelopeSchema = z.object({
  name: jobNameSchema,
  dispatchedAt: z.string(),
  payload: z.unknown(),
});

type JobEnvelope = z.infer<typeof jobEnvelopeSchema>;

export function isDefineJobName(name: string) {
  return jobNameSchema.safeParse(name).success;
}

export function getJobsEndpointUrl(name: string) {
  return `${JOBS_ENDPOINT_URL}/${name}`;
}

export function buildJobLabel(name: string, label?: string) {
  return label ? `${label},${name}` : name;
}

export function buildJobDeduplicationId(
  name: string,
  deduplicationId?: string,
) {
  if (!deduplicationId) {
    return undefined;
  }

  return `${deduplicationId},${name}`;
}

export function buildQStashJobRequest(
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
    scheduledAt: Date | null;
  },
  now: Date = new Date(),
) {
  const options = (job.options ?? {}) as JobReplayOptions;

  const notBefore =
    job.scheduledAt && job.scheduledAt > now
      ? Math.floor(job.scheduledAt.getTime() / 1000)
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

export function isPublishSuccess(
  response: unknown,
): response is { messageId: string } {
  return (
    typeof response === "object" &&
    response !== null &&
    "messageId" in response &&
    typeof response.messageId === "string"
  );
}

export async function sendJobs(jobs: Job[]): Promise<PublishResult[]> {
  if (jobs.length === 0) {
    return [];
  }

  const results: PublishResult[] = [];
  const now = new Date();

  for (const jobChunk of chunk(jobs, QSTASH_BATCH_CHUNK_SIZE)) {
    try {
      const responses = await qstash.batchJSON(
        jobChunk.map((job) => buildReplayRequest(job, now)),
      );

      jobChunk.forEach((job, index) => {
        const response = responses[index];

        if (isPublishSuccess(response)) {
          results.push({
            id: job.id,
            status: "published",
            lastError: null,
            messageId: response.messageId,
          });
        } else {
          results.push({
            id: job.id,
            status: "failed",
            lastError: "QStash batch publish did not return a messageId",
          });
        }
      });
    } catch (error) {
      const lastError = (
        error instanceof Error ? error.message : String(error)
      ).slice(0, LAST_ERROR_MAX_LENGTH);

      logger.error("jobs.publish_failed", {
        jobCount: jobChunk.length,
        errorMessage: lastError,
      });

      for (const job of jobChunk) {
        results.push({
          id: job.id,
          status: "failed",
          lastError,
        });
      }
    }
  }

  await logger.flush();

  return results;
}
