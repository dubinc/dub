import { getOwnedLinkImageKey } from "@/lib/api/links/get-owned-link-image-key";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { waitUntil } from "@vercel/functions";
import { linkCache } from "./cache";
import { includeTags } from "./include-tags";
import { transformLink } from "./utils";

export async function deleteLink(linkId: string) {
  const link = await prisma.link.findUniqueOrThrow({
    where: {
      id: linkId,
    },
    include: {
      ...includeTags,
    },
  });

  await prisma.link.delete({
    where: {
      id: linkId,
    },
  });

  const imageKey = getOwnedLinkImageKey(link.image, link.id);

  waitUntil(
    Promise.allSettled([
      // Delete the preview image only when it is this link's own object.
      imageKey && storage.delete({ key: imageKey }),

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
    ]),
  );

  return transformLink(link);
}
