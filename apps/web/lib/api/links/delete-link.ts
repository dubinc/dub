import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { R2_URL } from "@dub/utils";
import { Link } from "@prisma/client";
import { waitUntil } from "@vercel/functions";

type LinkWithTags = Pick<
  Link,
  "id" | "image" | "domain" | "key" | "projectId" | "createdAt" | "url"
> & { tags: { tagId: string }[] };

export async function deleteLink(linkId: string) {
  const link = await prisma.link.delete({
    where: {
      id: linkId,
    },
    include: {
      tags: true,
    },
  });

  waitUntil(finalizeLinkDeletion(link));
}

// Post-delete cleanup
export const finalizeLinkDeletion = async (link: LinkWithTags) => {
  return Promise.allSettled([
    // if there's a valid image and it has the same link ID, delete it
    link.image &&
      link.image.startsWith(`${R2_URL}/images/${link.id}`) &&
      storage.delete(link.image.replace(`${R2_URL}/`, "")),

    // Delete the link from Redis
    redis.hdel(link.domain.toLowerCase(), link.key.toLowerCase()),

    // Record the link deletion in Tinybird
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

    // Decrement the project's links usage
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
  ]);
};
