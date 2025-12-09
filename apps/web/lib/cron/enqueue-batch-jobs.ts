import { log } from "@dub/utils";
import type { PublishBatchRequest } from "@upstash/qstash";
import { qstash } from ".";

type EnqueueBatchJobsProps = PublishBatchRequest<unknown> & {
  queueName: "ban-partner" | "partner-program-summary";
};

// Generic helper to enqueue a batch of QStash jobs.
export async function enqueueBatchJobs(jobs: EnqueueBatchJobsProps[]) {
  try {
    const result = await qstash.batchJSON(jobs);

    if (process.env.NODE_ENV === "development") {
      console.info(
        `[enqueueBatchJobs] ${result.length} batch jobs enqueued successfully.`,
        {
          jobs,
        },
      );
    }

    return result;
  } catch (error) {
    console.error("[enqueueBatchJobs] Failed to enqueue batch jobs", {
      error: JSON.stringify(error, null, 2),
      jobs,
    });

    await log({
      message: `[enqueueBatchJobs] Failed to enqueue batch jobs: ${JSON.stringify(error, null, 2)}`,
      type: "errors",
      mention: true,
    });

    throw new Error(
      `Failed to enqueue batch jobs: ${JSON.stringify(error, null, 2)}`,
    );
  }
}
