import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import { R2_URL } from "@dub/utils";
import { Link, Tag } from "@prisma/client";

export async function bulkDeleteLinks({
  links,
  workspaceId,
}: {
  links: (Link & { tags: Pick<Tag, "id">[] })[];
  workspaceId: string;
}) {
  if (links.length === 0) {
    return;
  }

  const pipeline = redis.pipeline();

  links.forEach((link) => {
    pipeline.del(`${link.domain}:${link.key}`.toLowerCase());
  });

  await Promise.allSettled([
    // Record link in the Tinybird
    recordLink(
      links.map((link) => ({
        link_id: link.id,
        domain: link.domain,
        key: link.key,
        url: link.url,
        tag_ids: link.tags.map((tag) => tag.id),
        workspace_id: workspaceId,
        created_at: link.createdAt,
        deleted: true,
      })),
    ),

    // Remove image from R2 storage if it exists
    links
      .filter((link) => link.image?.startsWith(`${R2_URL}/images/${link.id}`))
      .map((link) => storage.delete(link.image!.replace(`${R2_URL}/`, ""))),

    // Remove the link from Redis
    pipeline.exec(),

    // Remove the link from MySQL
    prisma.link.deleteMany({
      where: {
        id: { in: links.map((link) => link.id) },
      },
    }),
  ]);
}
