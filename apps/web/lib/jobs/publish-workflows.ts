import { createId } from "@/lib/api/create-id";
import { persistFailedJobs } from "./outbox";
import {
  triggerWorkflows,
  type WorkflowName,
  type WorkflowOptions,
} from "./send-workflows";
import type { PersistableJob } from "./types";

type DispatchWorkflowInput = {
  name: WorkflowName;
  payload: unknown;
  options?: WorkflowOptions;
};

type DispatchWorkflowsResult = {
  published: number;
  failed: number;
  results: Awaited<ReturnType<typeof triggerWorkflows>>;
};

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

  const jobs: PersistableJob[] = inputs.map((job) => {
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
    (result) => result.status === "published",
  );

  const failedResults = results.filter((result) => result.status === "failed");

  await persistFailedJobs({
    jobs,
    failedResults,
    logEvent: "workflows.dispatch_lost",
  });

  return {
    published: publishedResults.length,
    failed: failedResults.length,
    results,
  };
}
