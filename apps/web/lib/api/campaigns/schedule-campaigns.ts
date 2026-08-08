import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { PARTNER_ENROLLED_WORKFLOW_CRON } from "@/lib/zod/schemas/workflows";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { Campaign, CampaignType, Workflow } from "@prisma/client";
import { isScheduledWorkflow } from "../workflows/utils";

type ScheduleCampaignProps = {
  campaign: Campaign;
  updatedCampaign: Campaign & {
    workflow: Workflow | null;
  };
};

export const scheduleCampaign = async ({
  campaign,
  updatedCampaign,
}: ScheduleCampaignProps) => {
  if (campaign.type == CampaignType.marketing) {
    return scheduleMarketingCampaign({
      campaign,
      updatedCampaign,
    });
  }

  if (campaign.type == CampaignType.transactional) {
    return scheduleTransactionalCampaign({
      campaign,
      updatedCampaign,
    });
  }
};

export const deleteCampaignSchedule = async (
  campaign: Pick<Campaign, "type" | "qstashMessageId"> & {
    workflow: Pick<Workflow, "id" | "triggerConditions" | "actions"> | null;
  },
) => {
  if (campaign.type == CampaignType.marketing && campaign.qstashMessageId) {
    try {
      await qstash.messages.cancel(campaign.qstashMessageId);
    } catch (error) {
      console.warn(
        `Failed to delete QStash message ${campaign.qstashMessageId}:`,
        error,
      );
    }
    return;
  }

  if (
    campaign.type == CampaignType.transactional &&
    campaign.workflow &&
    isScheduledWorkflow(campaign.workflow)
  ) {
    try {
      await qstash.schedules.delete(campaign.workflow.id);
    } catch (error) {
      console.warn(
        `Failed to delete QStash schedule ${campaign.workflow.id}:`,
        error,
      );
    }
  }
};

// Schedule a marketing campaign
const scheduleMarketingCampaign = async ({
  campaign,
  updatedCampaign,
}: ScheduleCampaignProps) => {
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
      await qstash.messages.cancel(campaign.qstashMessageId);
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
}: ScheduleCampaignProps) => {
  if (
    !updatedCampaign.workflow ||
    !isScheduledWorkflow(updatedCampaign.workflow)
  ) {
    return;
  }

  const shouldSchedule =
    (campaign.status === "draft" || campaign.status === "paused") &&
    updatedCampaign.status === "active";

  if (shouldSchedule) {
    try {
      return await qstash.schedules.create({
        destination: `${APP_DOMAIN_WITH_NGROK}/api/cron/workflows/${updatedCampaign.workflow.id}`,
        cron: PARTNER_ENROLLED_WORKFLOW_CRON,
        scheduleId: updatedCampaign.workflow.id,
      });
    } catch (error) {
      console.warn(
        `Failed to create QStash schedule ${updatedCampaign.workflow.id}:`,
        error,
      );
    }
    return;
  }

  const shouldDeleteSchedule =
    campaign.status === "active" && updatedCampaign.status === "paused";

  if (shouldDeleteSchedule) {
    try {
      return await qstash.schedules.delete(updatedCampaign.workflow.id);
    } catch (error) {
      console.warn(
        `Failed to delete QStash schedule ${updatedCampaign.workflow.id}:`,
        error,
      );
    }
  }
};
