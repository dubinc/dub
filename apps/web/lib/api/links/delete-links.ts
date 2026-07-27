import { deleteDiscountCodes } from "@/lib/discounts/delete-discount-code";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { R2_URL } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { linkCache } from "./cache";
import { ExpandedLink } from "./utils";

/**
 * Canonical bulk link deletion:
 * 1. Delete related DiscountCodes (and enqueue provider cleanup)
 * 2. Delete Link rows + decrement totalLinks (transaction)
 * 3. Run side effects (Redis / Tinybird / R2)
 */
export async function deleteLinks(
  links: ExpandedLink[],
  options?: {
    where?: Omit<Prisma.LinkWhereInput, "id">;
  },
): Promise<{ deletedCount: number }> {
  if (links.length === 0) {
    return { deletedCount: 0 };
  }

  const linkIds = links.map((link) => link.id);

  const discountCodes = await prisma.discountCode.findMany({
    where: {
      linkId: {
        in: linkIds,
      },
    },
    include: {
      discount: {
        select: {
          provider: true,
        },
      },
    },
  });

  await deleteDiscountCodes(discountCodes);

  const workspaceId = links[0].projectId;

  const { count: deletedCount } = await prisma.$transaction(async (tx) => {
    const result = await tx.link.deleteMany({
      where: {
        id: {
          in: linkIds,
        },
        ...options?.where,
      },
    });

    if (result.count > 0 && workspaceId) {
      await tx.project.update({
        where: {
          id: workspaceId,
        },
        data: {
          totalLinks: {
            decrement: result.count,
          },
        },
      });
    }

    return result;
  });

  if (deletedCount > 0) {
    await Promise.allSettled([
      // Delete the links from Redis
      linkCache.deleteMany(links),

      // Record the links deletion in Tinybird
      recordLink(links, { deleted: true }),

      // For links that have an image, delete the image from R2
      links
        .filter((link) => link.image?.startsWith(`${R2_URL}/images/${link.id}`))
        .map((link) =>
          storage.delete({ key: link.image!.replace(`${R2_URL}/`, "") }),
        ),
    ]);
  }

  console.log(`Deleted ${deletedCount} links.`);

  return {
    deletedCount,
  };
}
