import { dub } from "@/lib/dub";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export const getReferralLink = unstable_cache(async (slug: string) => {
  const workspace = await prisma.project.findUnique({
    where: {
      slug,
    },
  });
  if (!workspace) {
    return null;
  }
  const workspaceId = `ws_${workspace.id}`;

  try {
    return await dub.links.get({
      externalId: `ext_${workspaceId}`,
    });
  } catch (error) {
    return null;
  }
});
