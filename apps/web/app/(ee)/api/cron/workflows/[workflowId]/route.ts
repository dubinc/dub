import { executeSendCampaignWorkflow } from "@/lib/api/workflows/execute-send-campaign-workflow";
import { parseWorkflowConfig } from "@/lib/api/workflows/parse-workflow-config";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// POST /api/cron/workflows/[workflowId] - Execute a scheduled workflow
export const POST = withCron(async ({ params }) => {
  const { workflowId } = params;

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
});
