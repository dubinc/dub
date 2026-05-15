import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { Client } from "@upstash/workflow";
import { getErrorMessage } from "../api/errors";

const client = new Client({
  token: process.env.QSTASH_TOKEN || "",
});

const WORKFLOW_RETRIES = 3;
const WORKFLOW_PARALLELISM = 20;

type WorkflowIds = "partner-approved" | "sale-tracked";

interface QStashWorkflow {
  workflowId: WorkflowIds;
  body?: Record<string, unknown>;
}

// Run workflows
export async function triggerQStashWorkflow(
  input: QStashWorkflow | QStashWorkflow[],
) {
  try {
    const workflows = Array.isArray(input) ? input : [input];

    const results = await client.trigger(
      workflows.map((workflow) => ({
        url: `${APP_DOMAIN_WITH_NGROK}/api/workflows/${workflow.workflowId}`,
        body: workflow.body,
        retries: WORKFLOW_RETRIES,
        flowControl: {
          key: workflow.workflowId,
          parallelism: WORKFLOW_PARALLELISM,
        },
      })),
    );

    console.debug("[triggerQStashWorkflow] Workflows triggered", results);

    return results;
  } catch (error) {
    const message = getErrorMessage(error);

    console.error("[triggerQStashWorkflow] Failed to trigger workflows", {
      error: message,
      input,
    });

    await log({
      message: `[triggerQStashWorkflow] Failed to trigger QStash workflows. ${message}`,
      type: "errors",
    });

    return null;
  }
}
