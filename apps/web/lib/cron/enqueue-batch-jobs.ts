import { log } from "@dub/utils";
import { qstash } from ".";

interface BatchJob<T> {
  queueName: string;
  url: string;
  body: T;
}

// Generic helper to enqueue a batch of QStash jobs.
export async function enqueueBatchJobs<T>(jobs: BatchJob<T>[]) {
  try {
    const result = await qstash.batchJSON(jobs);

    console.info(
      `[enqueueBatchJobs] ${result.length} batch jobs enqueued successfully`,
    );

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

    return [];
  }
}
