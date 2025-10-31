import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { Client } from "@upstash/workflow";
import { z } from "zod";
import { partnerApprovedWorkflowSchema } from "../zod/schemas/partners";
import { createStripeTransferWorkflowSchema } from "../zod/schemas/payouts";

const client = new Client({
  token: process.env.QSTASH_TOKEN || "",
});

const WORKFLOW_CONFIG = {
  "partner-approved": {
    retries: 3,
    parallelism: 20,
    url: `${APP_DOMAIN_WITH_NGROK}/api/workflows/partner-approved`,
    schema: partnerApprovedWorkflowSchema,
  },

  "create-stripe-transfer": {
    retries: 3,
    parallelism: 10,
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/payouts/create-stripe-transfer`,
    schema: createStripeTransferWorkflowSchema,
  },
} as const;

type WorkflowIds = keyof typeof WORKFLOW_CONFIG;

type WorkflowPayloads = {
  [K in WorkflowIds]: z.infer<(typeof WORKFLOW_CONFIG)[K]["schema"]>;
};

export type QStashWorkflow<T extends WorkflowIds = WorkflowIds> = {
  workflowId: T;
  body: WorkflowPayloads[T];
};

// Run workflows
export async function triggerWorkflows(
  input: QStashWorkflow<WorkflowIds> | QStashWorkflow<WorkflowIds>[],
) {
  try {
    const workflows = Array.isArray(input) ? input : [input];

    const results = await client.trigger(
      workflows.map(({ workflowId, body }) => {
        const { url, retries, parallelism } = WORKFLOW_CONFIG[workflowId];

        return {
          url,
          body,
          retries,
          flowControl: {
            key: workflowId,
            parallelism,
          },
        };
      }),
    );

    if (process.env.NODE_ENV === "development") {
      console.debug("[Upstash] Workflows triggered", {
        count: workflows.length,
        ids: workflows.map((w) => w.workflowId),
        results,
      });
    }

    return results;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);

    console.error("[Upstash] Failed to trigger workflows", {
      error: message,
      input,
    });

    await log({
      message: `[Upstash] Failed to trigger QStash workflows. ${message}`,
      type: "errors",
    });

    return null;
  }
}
