import { prisma } from "@/lib/prisma";
import { CampaignStatus, CampaignType } from "@prisma/client";

export async function pauseOrCancelCampaignsForProgramOnPlanDowngrade({
  programId,
}: {
  programId: string;
}): Promise<void> {
  await prisma.campaign.updateMany({
    where: {
      programId,
      type: CampaignType.marketing,
      status: {
        in: [CampaignStatus.scheduled, CampaignStatus.sending],
      },
    },
    data: {
      status: CampaignStatus.canceled,
    },
  });

  const transactionalCampaigns = await prisma.campaign.findMany({
    where: {
      programId,
      type: CampaignType.transactional,
      status: CampaignStatus.active,
    },
  });

  for (const campaign of transactionalCampaigns) {
    try {
      await prisma.$transaction(async (tx) => {
        if (campaign.workflowId) {
          await tx.workflow.update({
            where: { id: campaign.workflowId },
            data: { disabledAt: new Date() },
          });
        }

        await tx.campaign.update({
          where: { id: campaign.id },
          data: { status: CampaignStatus.paused },
        });
      });
    } catch (error) {
      console.warn(
        `Failed to pause transactional campaign ${campaign.id} on plan downgrade:`,
        error,
      );
    }
  }
}
