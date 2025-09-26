import "dotenv-flow/config";
import { createId } from "@/lib/api/create-id";
import { qstash } from "@/lib/cron";
import { WorkflowAction, WorkflowCondition } from "@/lib/types";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { WorkflowTrigger, WorkflowTriggerType } from "@prisma/client";

async function main() {
   const workflow = await createCampaign();
  await scheduleWorkflow(workflow.id);
}

async function createCampaign() {
  const campaignId = createId({ prefix: "cmp_" });

  // When partner has been in the program for 10 days
  const condition: WorkflowCondition = {
    attribute: "partnerJoinedDuration",
    operator: "gte",
    value: 10,
  };

  const action: WorkflowAction = {
    type: WORKFLOW_ACTION_TYPES.SendCampaign,
    data: {
      campaignId,
    },
  };

  const workflow = await prisma.workflow.create({
    data: {
      id: createId({ prefix: "wf_" }),
      programId: "prog_1K2J9DRWPPJ2F1RX53N92TSGA",
      trigger: WorkflowTrigger.partnerJoinedDuration,
      triggerType: WorkflowTriggerType.scheduled,
      triggerConditions: [condition],
      actions: [action],
    },
  });

  const campaign = await prisma.campaign.create({
    data: {
      id: campaignId,
      programId: "prog_1K2J9DRWPPJ2F1RX53N92TSGA",
      type: "automation",
      status: "active",
      name: "Campaign 1",
      subject: "Test Campaign",
      body: "This is a test campaign.",
      workflowId: workflow.id,
      userId: "cludszk1h0000wmd2e0ea2b0p"
    },
  });

  console.log(campaign);
  console.log(workflow);

  return workflow;
}

async function scheduleWorkflow(workflowId: string) {
  const schedule = await qstash.schedules.create({
    destination: `${APP_DOMAIN_WITH_NGROK}/api/cron/workflows/${workflowId}`,
    cron: "*/5 * * * *",
    queueName: "campaign-workflows",
  });

  console.log(schedule);
}

main();
