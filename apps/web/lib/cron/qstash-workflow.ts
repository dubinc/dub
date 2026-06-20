import { logger } from "@/lib/axiom/server";
import { APP_DOMAIN_WITH_NGROK, pluralize } from "@dub/utils";
import { FlowControl } from "@upstash/qstash";
import { Client } from "@upstash/workflow";

const client = new Client({
  baseUrl: process.env.QSTASH_URL || "https://qstash-us-east-1.upstash.io",
  token: process.env.QSTASH_TOKEN || "",
});

type WorkflowType = "partner-approved" | "create-partner-commission";

interface QStashWorkflow {
  workflowType: WorkflowType;
  workflowLabel: string;
  body: Record<string, unknown>;
  flowControl?: FlowControl;
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
          label: workflow.workflowLabel,
          retries: 5,
          flowControl: workflow.flowControl ?? {
            key: workflow.workflowType,
            parallelism: 15,
          },
        })),
      );

      console.log(
        `${response.length} QStash ${pluralize("workflow", response.length)} triggered`,
        response,
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

export function getWorkflowConfig({
  workflowType,
  body,
}: Omit<QStashWorkflow, "workflowLabel">): {
  correlation: Record<string, unknown>;
} {
  switch (workflowType) {
    case "partner-approved":
      return {
        correlation: {
          programId: body.programId,
          partnerId: body.partnerId,
          userId: body.userId,
        },
      };

    case "create-partner-commission": {
      return {
        correlation: {
          programId: body.programId,
          partnerId: body.partnerId,
          customerId: body.customerId,
          bountySubmissionId: body.bountySubmissionId,
        },
      };
    }

    default:
      return {
        correlation: {},
      };
  }
}
