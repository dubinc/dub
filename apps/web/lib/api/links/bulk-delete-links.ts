import { deleteDiscountCodes } from "@/lib/discounts/delete-discount-code";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { chunk, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { linkCache } from "./cache";
import { ExpandedLink } from "./utils";

const DELETE_LINKS_BATCH_SIZE = 100;

/**
 * Canonical bulk link deletion:
 * 1. Delete related DiscountCodes (and enqueue provider cleanup)
 * 2. Delete Link rows + decrement totalLinks (transaction)
 * 3. Run side effects (Redis / Tinybird / R2)
 *
 * Processes links in batches of DELETE_LINKS_BATCH_SIZE.
 * Callers must pass links from a single workspace — totalLinks is
 * decremented on links[0].projectId for the whole batch.
 */
export async function bulkDeleteLinks(
  links: ExpandedLink[],
): Promise<{ deletedCount: number }> {
  if (links.length === 0) {
    return {
      deletedCount: 0,
    };
  }

  let deletedCount = 0;

  // Delete links in batches
  const batches = chunk(links, DELETE_LINKS_BATCH_SIZE);

  for (const [batchIndex, batch] of batches.entries()) {
    const batchDeletedCount = await deleteLinksBatch(batch);

    deletedCount += batchDeletedCount;

    console.log(
      `Deleted ${batchDeletedCount} links in batch ${batchIndex + 1}/${batches.length}`,
    );
  }

  if (deletedCount > 0) {
    waitUntil(
      Promise.allSettled([
        // Delete the links from Redis
        linkCache.deleteMany(links),

        // Record the links deletion in Tinybird
        recordLink(links, { deleted: true }),

        // For links that have an image, delete the image from R2
        ...links
          .filter((link) =>
            link.image?.startsWith(`${R2_URL}/images/${link.id}`),
          )
          .map((link) =>
            storage.delete({ key: link.image!.replace(`${R2_URL}/`, "") }),
          ),
      ]),
    );
  }

  return {
    deletedCount,
  };
}

async function deleteLinksBatch(links: ExpandedLink[]): Promise<number> {
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

  return deletedCount;
}
