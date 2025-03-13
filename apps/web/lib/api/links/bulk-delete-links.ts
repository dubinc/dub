import { storage } from "@/lib/storage";
import { recordLinkTB, transformLinkTB } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { R2_URL } from "@dub/utils";
import { linkCache } from "./cache";
import { ExpandedLink } from "./utils";

export async function bulkDeleteLinks(links: ExpandedLink[]) {
  if (links.length === 0) {
    return;
  }

  return await Promise.all([
    // Delete the links from Redis
    linkCache.deleteMany(links),

    // Record the links deletion in Tinybird
    recordLinkTB(
      links.map((link) => ({
        ...transformLinkTB(link),
        deleted: true,
      })),
    ),

    // For links that have an image, delete the image from R2
    links
      .filter((link) => link.image?.startsWith(`${R2_URL}/images/${link.id}`))
      .map((link) => storage.delete(link.image!.replace(`${R2_URL}/`, ""))),

    // Update totalLinks for the workspace
    prisma.project.update({
      where: {
        id: links[0].projectId!,
      },
      data: {
        totalLinks: { decrement: links.length },
      },
    }),
  ]);
}
