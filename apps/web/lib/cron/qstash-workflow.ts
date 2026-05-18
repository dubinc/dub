import { logger } from "@/lib/axiom/server";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { FlowControl } from "@upstash/qstash";
import { Client } from "@upstash/workflow";

const client = new Client({
  token: process.env.QSTASH_TOKEN || "",
});

type WorkflowType = "partner-approved" | "sale-tracked";

interface QStashWorkflow {
  workflowType: WorkflowType;
  body: Record<string, unknown>;
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
        workflows.map((workflow) => {
          const { flowControl } = getWorkflowConfig(workflow);

          return {
            url: `${APP_DOMAIN_WITH_NGROK}/api/workflows/${workflow.workflowType}`,
            body: workflow.body,
            label: workflow.workflowType,
            retries: 5,
            flowControl,
          };
        }),
      );

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
        const { correlation } = getWorkflowConfig(workflow);

        logger.error("workflow.trigger_failed", {
          service: "qstash",
          event: "workflow.trigger_failed",
          workflowType: workflow.workflowType,
          errorName: error instanceof Error ? error.name : undefined,
          errorStack: error instanceof Error ? error.stack : undefined,
          correlation,
        });
      }

      await logger.flush();

      return null;
    }
  }
}

export function getWorkflowConfig({ workflowType, body }: QStashWorkflow): {
  correlation: Record<string, unknown>;
  flowControl: FlowControl;
} {
  switch (workflowType) {
    case "sale-tracked": {
      const saleEvent = body.saleEvent as Record<string, string>;

      return {
        correlation: {
          linkId: saleEvent.link_id,
          eventId: saleEvent.event_id,
          customerId: saleEvent.customer_id,
        },

        // Limit the number of concurrent workflow runs for a given customer
        flowControl: {
          key: `${workflowType}:${saleEvent.customer_id}`,
          parallelism: 1,
        },
      };
    }

    case "partner-approved":
      return {
        correlation: {
          programId: body.programId,
          partnerId: body.partnerId,
          userId: body.userId,
        },

        // Limit the number of concurrent workflow runs for a given program
        flowControl: {
          key: `${workflowType}:${body.programId}`,
          parallelism: 10,
        },
      };

    default:
      throw new Error(`Invalid workflow type: ${workflowType}`);
  }
}
