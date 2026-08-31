import { logger, toErrorFields } from "@/lib/axiom/server";
import { APP_DOMAIN_WITH_NGROK, chunk, serializeError } from "@dub/utils";
import { PublishRequest } from "@upstash/qstash";
import { Client, TriggerOptions } from "@upstash/workflow";
import { LAST_ERROR_MAX_LENGTH, QSTASH_BATCH_CHUNK_SIZE } from "./constants";
import type { PersistableJob, PublishResult } from "./types";

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

export type WorkflowOptions = Pick<
  PublishRequest,
  "label" | "deduplicationId" | "retries" | "flowControl"
>;

export function isWorkflowName(name: string): name is WorkflowName {
  return Object.prototype.hasOwnProperty.call(workflowPathMap, name);
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

function buildTriggerRequest(job: PersistableJob): TriggerOptions {
  const name = job.name as WorkflowName;
  const options = (job.options ?? {}) as WorkflowOptions;
  const workflowPath = workflowPathMap[name];
  const workflowKey = workflowPath.split("/").pop()!;

  return {
    url: `${APP_DOMAIN_WITH_NGROK}${workflowPath}`,
    body: job.payload,
    workflowRunId: options.deduplicationId ?? job.id,
    retries: options.retries ?? 5,
    flowControl: options.flowControl ?? {
      key: workflowKey,
      parallelism: 15,
    },
    ...(options.label && { label: options.label }),
  };
}

/** Publish workflows to QStash Workflows (no DB writes). */
export async function triggerWorkflows(
  jobs: PersistableJob[],
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
            status: "published",
            lastError: null,
            workflowRunId: response.workflowRunId,
          });
        } else {
          results.push({
            id: job.id,
            status: "failed",
            lastError: "Workflow trigger did not return a workflowRunId",
          });
        }
      });
    } catch (error) {
      const lastError = serializeError(error).slice(0, LAST_ERROR_MAX_LENGTH);

      logger.error("workflows.publish_failed", {
        jobCount: jobChunk.length,
        error: toErrorFields(error),
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
