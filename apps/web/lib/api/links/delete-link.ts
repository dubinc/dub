import {
  PARTNER_SEARCH_LINK_SYNC_DELAY_SECONDS,
  queuePartnerSearchSync,
} from "@/lib/api/partners/queue-partner-search-sync";
import { enqueueDeleteDiscountCode } from "@/lib/discounts/delete-discount-code";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { linkCache } from "./cache";
import { includeProgramEnrollment } from "./include-program-enrollment";
import { includeTags } from "./include-tags";
import { transformLink } from "./utils";

export async function deleteLink(linkId: string) {
  const link = await prisma.link.findUniqueOrThrow({
    where: {
      id: linkId,
    },
    include: {
      ...includeTags,
      ...includeProgramEnrollment,
      discountCode: {
        include: {
          discount: {
            select: {
              provider: true,
            },
          },
        },
      },
    },
  });

  // Delete the discount code and link in a transaction
  await prisma.$transaction([
    ...(link.discountCode
      ? [
          prisma.discountCode.delete({
            where: {
              id: link.discountCode.id,
            },
          }),
        ]
      : []),

    prisma.link.delete({
      where: {
        id: linkId,
      },
    }),
  ]);

  waitUntil(
    Promise.allSettled([
      // if there's a valid image and it has the same link ID, delete it
      link.image &&
        link.image.startsWith(`${R2_URL}/images/${link.id}`) &&
        storage.delete({ key: link.image.replace(`${R2_URL}/`, "") }),

      // Remove the link from Redis
      linkCache.delete(link),

      // Record link in the Tinybird
      recordLink(link, { deleted: true }),

      link.projectId &&
        prisma.project.update({
          where: {
            id: link.projectId,
          },
          data: {
            totalLinks: {
              decrement: 1,
            },
          },
        }),

      link.discountCode && enqueueDeleteDiscountCode([link.discountCode]),

      // The enrollment outlives the link, so this re-serializes the document
      // without it rather than removing the document. Takes the link delay:
      // a deleted short link matching a search is a stale hit, not a wrong one,
      // since the database still filters the candidates the index returns.
      link.programId &&
        link.partnerId &&
        queuePartnerSearchSync({
          partnerIds: [link.partnerId],
          programId: link.programId,
          delay: PARTNER_SEARCH_LINK_SYNC_DELAY_SECONDS,
        }),
    ]),
  );

  return transformLink(link);
}
