import { prisma } from "@/lib/prisma";
import { isStored, storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";

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
      // if the image is stored in Cloudflare R2, delete it
      link.image &&
        isStored(link.image) &&
        storage.delete(link.image.replace(`${R2_URL}/`, "")),
      redis.hdel(link.domain.toLowerCase(), link.key.toLowerCase()),
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
