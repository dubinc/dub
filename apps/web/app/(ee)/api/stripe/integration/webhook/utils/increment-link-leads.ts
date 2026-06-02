import { includeTags } from "@/lib/api/links/include-tags";
import { prisma } from "@dub/prisma";

export async function incrementLinkLeads(linkId: string) {
  return prisma.link.update({
    where: {
      id: linkId,
    },
    data: {
      leads: {
        increment: 1,
      },
      lastLeadAt: new Date(),
    },
    include: includeTags,
  });
}
