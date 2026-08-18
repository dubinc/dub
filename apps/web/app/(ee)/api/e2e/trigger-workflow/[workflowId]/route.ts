import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseWorkflowConfig } from "@/lib/api/workflows/parse-workflow-config";
import { executeSendCampaignWorkflow } from "@/lib/api/workflows/send-campaign/execute";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { ACME_PROGRAM_ID } from "@dub/utils";
import { NextResponse } from "next/server";
import { assertE2EWorkspace } from "../../guard";

// POST /api/e2e/trigger-workflow/[workflowId]
// Executes a workflow directly with API token auth (no QStash signature needed).
export const POST = withWorkspace(async ({ workspace, params }) => {
  assertE2EWorkspace(workspace);

  const { workflowId } = params;

  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId, programId: ACME_PROGRAM_ID },
    });

    if (!workflow) {
      return NextResponse.json({
        message: `Workflow ${workflowId} not found. Skipping...`,
      });
    }

    if (workflow.disabledAt) {
      return NextResponse.json({
        message: `Workflow ${workflowId} is disabled. Skipping...`,
      });
    }

    const workflowConfig = parseWorkflowConfig(workflow);

    if (workflowConfig.action.type === WORKFLOW_ACTION_TYPES.SendCampaign) {
      await executeSendCampaignWorkflow({ workflow });
    }

    return NextResponse.json({
      message: `Finished executing workflow ${workflowId}.`,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
