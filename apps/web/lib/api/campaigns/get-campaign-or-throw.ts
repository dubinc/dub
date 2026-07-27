import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { DubApiError } from "../errors";

type CampaignInclude = "workflow" | "groups" | "partnerTags";

type CampaignIncludeMap<T extends readonly CampaignInclude[]> = {
  [K in T[number]]: true;
};

export async function getCampaignOrThrow<
  const TIncludes extends readonly CampaignInclude[] = [],
>({
  programId,
  campaignId,
  includes = [] as unknown as TIncludes,
}: {
  programId: string;
  campaignId: string;
  includes?: TIncludes;
}): Promise<
  Prisma.CampaignGetPayload<{
    include: CampaignIncludeMap<TIncludes>;
  }>
> {
  const include = Object.fromEntries(
    includes.map((key) => [key, true]),
  ) as CampaignIncludeMap<TIncludes>;

  const campaign = await prisma.campaign.findUnique({
    where: {
      id: campaignId,
    },
    include,
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

  return campaign as Prisma.CampaignGetPayload<{
    include: CampaignIncludeMap<TIncludes>;
  }>;
}
