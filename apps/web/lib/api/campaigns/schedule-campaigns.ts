import { qstash } from "@/lib/cron";
import { WORKFLOW_SCHEDULES } from "@/lib/zod/schemas/workflows";
import { Campaign, Workflow } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { isScheduledWorkflow } from "../workflows/utils";

export const scheduleMarketingCampaign = async ({
  campaign,
  updatedCampaign,
}: {
  campaign: Campaign;
  updatedCampaign: Campaign;
}) => {
  const shouldQueue =
    campaign.status === "draft" && updatedCampaign.status === "scheduled";

  if (!shouldQueue) {
    return;
  }

  const notBefore = updatedCampaign.scheduledAt
    ? Math.floor(updatedCampaign.scheduledAt.getTime() / 1000)
    : null;

  await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/campaigns/broadcast`,
    method: "POST",
    ...(notBefore && { notBefore }),
    body: {
      campaignId: campaign.id,
    },
  });
};

export const scheduleTransactionalCampaign = async ({
  campaign,
  updatedCampaign,
}: {
  campaign: Campaign;
  updatedCampaign: Campaign & {
    workflow: Workflow | null;
  };
}) => {
  if (!updatedCampaign.workflow) {
    return;
  }

  if (!isScheduledWorkflow(updatedCampaign.workflow)) {
    return;
  }

  const shouldSchedule =
    (campaign.status === "draft" || campaign.status === "paused") &&
    updatedCampaign.status === "active";

  const cronSchedule = WORKFLOW_SCHEDULES[updatedCampaign.workflow.trigger];

  if (!cronSchedule) {
    throw new Error(
      `Cron schedule not found for trigger ${updatedCampaign.workflow.trigger}`,
    );
  }

  if (shouldSchedule) {
    return await qstash.schedules.create({
      destination: `${APP_DOMAIN_WITH_NGROK}/api/cron/workflows/${updatedCampaign.workflow.id}`,
      cron: cronSchedule,
      scheduleId: updatedCampaign.workflow.id,
    });
  }

  const shouldDeleteSchedule =
    campaign.status === "active" && updatedCampaign.status === "paused";

  if (shouldDeleteSchedule) {
    return await qstash.schedules.delete(updatedCampaign.workflow.id);
  }
};
