import { qstash } from "@/lib/cron";
import { WORKFLOW_SCHEDULES } from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { Campaign, Workflow } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { isScheduledWorkflow } from "../workflows/utils";

// Schedule a marketing campaign
export const scheduleMarketingCampaign = async ({
  campaign,
  updatedCampaign,
}: {
  campaign: Campaign;
  updatedCampaign: Campaign;
}) => {
  if (updatedCampaign.status === "draft") {
    return;
  }

  const scheduleChanged =
    campaign.scheduledAt?.getTime() !== updatedCampaign.scheduledAt?.getTime();

  const statusChanged =
    (campaign.status === "draft" && updatedCampaign.status === "scheduled") ||
    (campaign.status === "scheduled" && updatedCampaign.status === "canceled");

  if (!statusChanged && !scheduleChanged) {
    return;
  }

  let qstashMessageId = updatedCampaign.qstashMessageId;

  // Delete the existing message
  if (campaign.qstashMessageId) {
    try {
      await qstash.messages.delete(campaign.qstashMessageId);
      qstashMessageId = null;
    } catch (error) {
      console.warn(
        `Failed to delete QStash message ${campaign.qstashMessageId}:`,
        error,
      );
    }
  }

  // Queue a new message
  if (updatedCampaign.status === "scheduled") {
    const notBefore = updatedCampaign.scheduledAt
      ? Math.floor(updatedCampaign.scheduledAt.getTime() / 1000)
      : null;

    try {
      const response = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/campaigns/broadcast`,
        method: "POST",
        ...(notBefore && { notBefore }),
        body: {
          campaignId: campaign.id,
        },
      });

      qstashMessageId = response.messageId;
    } catch (error) {
      console.warn(
        `Failed to queue QStash message for campaign ${campaign.id}:`,
        error,
      );
    }
  }

  await prisma.campaign.update({
    where: {
      id: campaign.id,
    },
    data: {
      qstashMessageId,
    },
  });
};

// Schedule a transactional campaign
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
