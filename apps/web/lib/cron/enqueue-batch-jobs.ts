import { log } from "@dub/utils";
import type { PublishBatchRequest } from "@upstash/qstash";
import { qstash } from ".";

type EnqueueBatchJobsProps = PublishBatchRequest<unknown> & {
  queueName:
    | "ban-partner"
    | "send-partner-summary"
    | "create-discount-code"
    | "sync-bounty-social-metrics"
    | "process-hubspot-webhook"
    | "process-intercom-webhook"
    | "delete-discount-code"
    | "create-referral-commissions"
    | "aggregate-clicks";
};

// Generic helper to enqueue a batch of QStash jobs.
export async function enqueueBatchJobs(jobs: EnqueueBatchJobsProps[]) {
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await qstash.batchJSON(jobs);
    } catch (error) {
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt)),
        );
        continue;
      }

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
}
