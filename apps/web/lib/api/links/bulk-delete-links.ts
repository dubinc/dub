import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { R2_URL } from "@dub/utils";
import { Link } from "@prisma/client";
import { linkCache } from "./cache";

export async function bulkDeleteLinks({
  links,
  workspaceId,
}: {
  links: (Link & { tags: { tagId: string }[] })[];
  workspaceId: string;
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
        tag_ids: link.tags.map(({ tagId }) => tagId),
        program_id: link.programId ?? "",
        workspace_id: link.projectId,
        created_at: link.createdAt,
        deleted: true,
      })),
    ),

    // For links that have an image, delete the image from R2
    links
      .filter((link) => link.image?.startsWith(`${R2_URL}/images/${link.id}`))
      .map((link) => storage.delete(link.image!.replace(`${R2_URL}/`, ""))),

    // Decrement the links count for the workspace
    prisma.project.update({
      where: {
        id: workspaceId,
      },
      data: {
        linksUsage: {
          decrement: links.length,
        },
      },
    }),
  ]);
}
