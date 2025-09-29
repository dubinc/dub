import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { executeSendCampaignAction } from "@/lib/api/workflows/execute-send-campaign-workflow";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { WorkflowTrigger } from "@prisma/client";
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

    if (workflow.triggerType !== "scheduled") {
      return logAndRespond(
        `Workflow ${workflowId} is not scheduled. Skipping...`,
      );
    }

    if (workflow.trigger === WorkflowTrigger.partnerJoinedDuration) {
      await executeSendCampaignAction({
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
