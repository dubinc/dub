import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { executeSendCampaignWorkflow } from "@/lib/api/workflows/execute-send-campaign-workflow";
import { parseWorkflowConfig } from "@/lib/api/workflows/parse-workflow-config";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// POST /api/cron/workflows/[workflowId] - Execute a scheduled workflow
export async function POST(
  req: Request,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  const { workflowId } = await params;

  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const workflow = await prisma.workflow.findUnique({
      where: {
        id: workflowId,
      },
    });

    if (!workflow) {
      return logAndRespond(`Workflow ${workflowId} not found. Skipping...`);
    }

    if (workflow.disabledAt) {
      return logAndRespond(`Workflow ${workflowId} is disabled. Skipping...`);
    }

    const workflowConfig = parseWorkflowConfig(workflow);

    if (workflowConfig.action.type === WORKFLOW_ACTION_TYPES.SendCampaign) {
      await executeSendCampaignWorkflow({
        workflow,
      });
    }

    return logAndRespond(`Finished executing workflow ${workflowId}.`);
  } catch (error) {
    await log({
      message: "Workflows dispatch cron failed. Error: " + error.message,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
