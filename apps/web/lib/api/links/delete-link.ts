import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { linkCache } from "./cache";

export async function deleteLink(linkId: string) {
  const link = await prisma.link.delete({
    where: {
      id: linkId,
    },
    include: {
      tags: true,
    },
  });
  waitUntil(
    Promise.allSettled([
      // if there's a valid image and it has the same link ID, delete it
      link.image &&
        link.image.startsWith(`${R2_URL}/images/${link.id}`) &&
        storage.delete(link.image.replace(`${R2_URL}/`, "")),

      // Delete link from redis
      linkCache.delete(link),

      recordLink({
        link_id: link.id,
        domain: link.domain,
        key: link.key,
        url: link.url,
        tag_ids: link.tags.map((tag) => tag.tagId),
        workspace_id: link.projectId,
        created_at: link.createdAt,
        deleted: true,
      }),
      link.projectId &&
        prisma.project.update({
          where: {
            id: link.projectId,
          },
          data: {
            linksUsage: {
              decrement: 1,
            },
          },
        }),
    ]),
  );

  return link;
}
