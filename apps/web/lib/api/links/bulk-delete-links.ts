import { storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { R2_URL } from "@dub/utils";
import { Link, Tag } from "@prisma/client";
import { linkCache } from "./cache";

export async function bulkDeleteLinks({
  links,
}: {
  links: (Link & { tags: Pick<Tag, "id">[] })[];
}) {
  if (links.length === 0) {
    return;
  }

  return await Promise.all([
    // Delete the links from Redis
    linkCache.deleteMany(links),

    // Record the links deletion in Tinybird
    recordLink(
      links.map((link) => ({
        link_id: link.id,
        domain: link.domain,
        key: link.key,
        url: link.url,
        workspace_id: link.projectId,
        created_at: link.createdAt,
        tag_ids: link.tags.map(({ id }) => id),
        deleted: true,
      })),
    ),

    // For links that have an image, delete the image from R2
    // TODO: How do we optimize this?
    links
      .filter((link) => link.image?.startsWith(`${R2_URL}/images/${link.id}`))
      .map((link) => storage.delete(link.image!.replace(`${R2_URL}/`, ""))),
  ]);
}
