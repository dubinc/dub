import { logger } from "@/lib/axiom/server";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Client } from "@upstash/workflow";

const client = new Client({
  token: process.env.QSTASH_TOKEN || "",
});

const WORKFLOW_RETRIES = 5;
const WORKFLOW_PARALLELISM = 20;

type WorkflowType = "partner-approved" | "sale-tracked";

interface QStashWorkflow {
  workflowType: WorkflowType;
  body?: Record<string, unknown>;
}

// Run workflows
export async function triggerQStashWorkflow(
  input: QStashWorkflow | QStashWorkflow[],
) {
  const workflows = Array.isArray(input) ? input : [input];
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.trigger(
        workflows.map((workflow) => ({
          url: `${APP_DOMAIN_WITH_NGROK}/api/workflows/${workflow.workflowType}`,
          body: workflow.body,
          label: workflow.workflowType,
          retries: WORKFLOW_RETRIES,
          flowControl: {
            key: workflow.workflowType,
            parallelism: WORKFLOW_PARALLELISM,
          },
        })),
      );

      for (const [index, workflow] of workflows.entries()) {
        logger.info("workflow.triggered", {
          service: "qstash-workflow",
          event: "workflow.triggered",
          status: "success",
          workflowType: workflow.workflowType,
          workflowRunId: response[index]?.workflowRunId,
          correlation: getWorkflowCorrelation(
            workflow.workflowType,
            workflow.body,
          ),
        });
      }

      await logger.flush();

      return response;
    } catch (error) {
      console.error("QStash workflow trigger failed", { error, workflows });

      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt)),
        );
        continue;
      }

      for (const workflow of workflows) {
        logger.error("workflow.trigger_failed", {
          service: "qstash-workflow",
          event: "workflow.trigger_failed",
          status: "error",
          workflowType: workflow.workflowType,
          errorName: error instanceof Error ? error.name : undefined,
          errorStack: error instanceof Error ? error.stack : undefined,
          correlation: getWorkflowCorrelation(
            workflow.workflowType,
            workflow.body,
          ),
        });
      }

      await logger.flush();

      return null;
    }
  }
}

function getWorkflowCorrelation(
  workflowType: WorkflowType,
  body?: Record<string, unknown>,
) {
  if (!body) return {};

  switch (workflowType) {
    case "sale-tracked": {
      const saleEvent = body.saleEvent as Record<string, unknown> | undefined;

      return {
        linkId: saleEvent?.link_id,
        customerId: saleEvent?.customer_id,
        eventId: saleEvent?.event_id,
      };
    }

    case "partner-approved":
      return {
        programId: body.programId,
        partnerId: body.partnerId,
        userId: body.userId,
      };

    default:
      return {};
  }
}
