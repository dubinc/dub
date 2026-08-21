import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { DubApiError } from "../errors";

export async function getCampaignOrThrow<
  T extends Prisma.CampaignInclude = {},
>({
  programId,
  campaignId,
  include,
}: {
  programId: string;
  campaignId: string;
  include?: T;
}): Promise<Prisma.CampaignGetPayload<{ include: T }>> {
  const campaign = await prisma.campaign.findUnique({
    where: {
      id: campaignId,
    },
    include,
  });

  if (!campaign || campaign.programId !== programId) {
    throw new DubApiError({
      code: "not_found",
      message: "Campaign not found.",
    });
  }

  return campaign as Prisma.CampaignGetPayload<{
    include: T;
  }>;
}
