import { dub } from "@/lib/dub";
import { prisma } from "@/lib/prisma";

export const getReferralLink = async (slug: string) => {
  const workspace = await prisma.project.findUnique({
    where: {
      slug,
    },
  });
  if (!workspace || !workspace.referralLinkId) {
    return null;
  }
  return await dub.links.get({
    linkId: workspace.referralLinkId,
  });
};
