import { logger, toErrorFields } from "@/lib/axiom/server";
import { qstash } from "@/lib/cron";
import { chunk } from "@dub/utils";
import * as z from "zod/v4";
import { QSTASH_BATCH_CHUNK_SIZE } from "./constants";
import { persistBackgroundJobs } from "./outbox";
import {
  buildJobLabel,
  buildQStashJobRequest,
  isPublishSuccess,
  jobNameSchema,
  type DispatchJobInput,
  type JobDispatchOptions,
} from "./send-jobs";

// Per-job defaults, merged under per-dispatch options
export type JobDefaults = Pick<
  JobDispatchOptions,
  "retries" | "queue" | "flowControl" | "label"
>;

type DispatchResult =
  | { status: "published"; messageId: string }
  | { status: "deferred"; backgroundJobId: string };

type DispatchBatchResult = {
  published: number;
  deferred: number;
  failed: number;
  results: DispatchResult[];
};

const QSTASH_PUBLISH_MAX_RETRIES = 3;

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
            error: toErrorFields(error),
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
        error: toErrorFields(error),
      });

      try {
        const deferredResults = await deferJobs(inputChunk);
        deferred += deferredResults.length;
        results.push(...deferredResults);
      } catch (persistError) {
        logger.error("jobs.dispatch_lost", {
          jobName,
          jobCount: inputChunk.length,
          error: toErrorFields(persistError),
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
