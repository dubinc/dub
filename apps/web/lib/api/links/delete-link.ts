import { storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { queueDiscountCodeDeletion } from "../discounts/queue-discount-code-deletion";
import { linkCache } from "./cache";
import { includeTags } from "./include-tags";
import { transformLink } from "./utils";

export async function deleteLink(linkId: string) {
  const link = await prisma.link.delete({
    where: {
      id: linkId,
    },
    include: {
      ...includeTags,
      discountCode: true,
    },
  });

  waitUntil(
    Promise.allSettled([
      // if there's a valid image and it has the same link ID, delete it
      link.image &&
        link.image.startsWith(`${R2_URL}/images/${link.id}`) &&
        storage.delete(link.image.replace(`${R2_URL}/`, "")),

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
            totalLinks: { decrement: 1 },
          },
        }),

      link.discountCode && queueDiscountCodeDeletion(link.discountCode.id),
    ]),
  );

  return transformLink(link);
}
