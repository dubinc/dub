import { prisma } from "@dub/prisma";

export async function hasActiveCampaignsForEmailDomain({
  programId,
  domainSlug,
}: {
  programId: string;
  domainSlug: string;
}) {
  const activeCampaignsCount = await prisma.campaign.count({
    where: {
      programId,
      status: {
        in: ["active", "scheduled", "sending"],
      },
      from: {
        endsWith: `@${domainSlug}`,
      },
    },
  });

  return activeCampaignsCount > 0;
}
