import { prisma } from "@/lib/prisma";
import { pluck } from "@dub/utils";

// Hard-delete soft-deleted PartnerGroupDefaultLink rows (groupId null) once
// no links still reference them. Group delete soft-deletes first so in-flight
// remap can keep partnerGroupDefaultLinkId; this cron finishes cleanup after
// the stale cutoff.
export async function deleteOrphanedDefaultLinks(cutoff: Date) {
  const defaultLinks = await prisma.partnerGroupDefaultLink.findMany({
    where: {
      groupId: null,
      updatedAt: {
        lt: cutoff,
      },
      links: {
        none: {},
      },
    },
    select: {
      id: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 50,
  });

  if (defaultLinks.length === 0) {
    return 0;
  }

  const { count } = await prisma.partnerGroupDefaultLink.deleteMany({
    where: {
      id: {
        in: pluck(defaultLinks, "id"),
      },
    },
  });

  return count;
}
