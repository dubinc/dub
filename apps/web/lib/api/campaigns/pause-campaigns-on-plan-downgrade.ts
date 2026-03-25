import { scheduleTransactionalCampaign } from "@/lib/api/campaigns/schedule-campaigns";
import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { CampaignStatus, CampaignType } from "@dub/prisma/client";

export async function pauseOrCancelCampaignsForProgramOnPlanDowngrade({
  programId,
}: {
  programId: string;
}): Promise<void> {
  const marketingCampaigns = await prisma.campaign.findMany({
    where: {
      programId,
      type: CampaignType.marketing,
      status: {
        in: [CampaignStatus.scheduled, CampaignStatus.sending],
      },
    },
  });

  for (const campaign of marketingCampaigns) {
    if (campaign.qstashMessageId) {
      try {
        await qstash.messages.delete(campaign.qstashMessageId);
      } catch (error) {
        console.warn(
          `Failed to delete QStash message ${campaign.qstashMessageId} for campaign ${campaign.id}:`,
          error,
        );
      }
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: CampaignStatus.canceled,
        qstashMessageId: null,
      },
    });
  }

  const transactionalCampaigns = await prisma.campaign.findMany({
    where: {
      programId,
      type: CampaignType.transactional,
      status: CampaignStatus.active,
    },
    include: {
      workflow: true,
    },
  });

  for (const campaign of transactionalCampaigns) {
    const updatedCampaign = await prisma.$transaction(async (tx) => {
      if (campaign.workflowId) {
        await tx.workflow.update({
          where: { id: campaign.workflowId },
          data: { disabledAt: new Date() },
        });
      }

      return tx.campaign.update({
        where: { id: campaign.id },
        data: { status: CampaignStatus.paused },
        include: { workflow: true },
      });
    });

    await scheduleTransactionalCampaign({
      campaign,
      updatedCampaign,
    });
  }
}
