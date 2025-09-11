import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { linkCache } from "./cache";
import { ExpandedLink } from "./utils/transform-link";

export async function propagateBulkLinkChanges({
  links,
  skipRedisCache = false,
}: {
  links: ExpandedLink[];
  skipRedisCache?: boolean;
}) {
  // If there are partner links, we need to get the group ID for each partner
  let partnerGroupMap = new Map<string, string | null>();
  const partnerLinks = links.filter((link) => link.programId && link.partnerId);

  if (partnerLinks.length > 0) {
    const programId = partnerLinks[0].programId!;
    const uniquePartnerIds = [
      ...new Set(partnerLinks.map((link) => link.partnerId) as string[]),
    ];

    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        partnerId: {
          in: uniquePartnerIds,
        },
        programId,
      },
      select: {
        partnerId: true,
        groupId: true,
      },
    });

    partnerGroupMap = new Map(
      enrollments.map(({ partnerId, groupId }) => [partnerId, groupId]),
    );
  }

  return await Promise.all([
    // update Redis cache
    !skipRedisCache && linkCache.mset(links),

    // update Tinybird
    recordLink(
      links.map((link) => ({
        ...link,
        partnerGroupId: link.partnerId
          ? partnerGroupMap.get(link.partnerId)
          : null,
      })),
    ),
  ]);
}
