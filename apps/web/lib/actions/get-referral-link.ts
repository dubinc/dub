import { dub } from "@/lib/dub";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export const getReferralLink = unstable_cache(async (slug: string) => {
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
});
