import { prisma } from "@/lib/prisma";
import { CampaignStatus, CampaignType } from "@prisma/client";

export async function pauseOrCancelCampaignsForProgramOnPlanDowngrade({
  programId,
}: {
  programId: string;
}): Promise<void> {
  // Cancel marketing campaigns
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
    select: {
      workflowId: true,
    },
  });

  const workflowIds = transactionalCampaigns.flatMap((campaign) =>
    campaign.workflowId ? [campaign.workflowId] : [],
  );

  await prisma.$transaction(async (tx) => {
    if (workflowIds.length > 0) {
      await tx.workflow.updateMany({
        where: {
          id: {
            in: workflowIds,
          },
          disabledAt: null,
        },
        data: {
          disabledAt: new Date(),
        },
      });
    }

    await tx.campaign.updateMany({
      where: {
        programId,
        type: CampaignType.transactional,
        status: CampaignStatus.active,
      },
      data: {
        status: CampaignStatus.paused,
      },
    });
  });
}
