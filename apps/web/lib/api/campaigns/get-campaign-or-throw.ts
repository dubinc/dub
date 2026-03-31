import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

export const getCampaignOrThrow = async ({
  campaignId,
  programId,
  includeWorkflow = false,
  includeGroups = false,
}: {
  campaignId: string;
  programId: string;
  includeWorkflow?: boolean;
  includeGroups?: boolean;
}) => {
  const campaign = await prisma.campaign.findUnique({
    where: {
      id: campaignId,
    },
    include: {
      workflow: includeWorkflow,
      groups: includeGroups,
    },
  });

  if (!campaign) {
    throw new DubApiError({
      code: "not_found",
      message: "Campaign not found.",
    });
  }

  if (campaign.programId !== programId) {
    throw new DubApiError({
      code: "forbidden",
      message: "You are not authorized to access this campaign.",
    });
  }

  return campaign;
};
