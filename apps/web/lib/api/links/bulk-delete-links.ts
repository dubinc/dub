import { storage } from "@/lib/storage";
import { recordLinkTB, transformLinkTB } from "@/lib/tinybird";
import { WorkspaceProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { R2_URL } from "@dub/utils";
import { enqueueCouponCodeDeletionJobs } from "../discounts/enqueue-promotion-code-deletion-jobs";
import { linkCache } from "./cache";
import { ExpandedLink } from "./utils";

export async function bulkDeleteLinks({
  links,
  workspace,
}: {
  links: ExpandedLink[];
  workspace: Pick<WorkspaceProps, "id" | "stripeConnectId">;
}) {
  if (links.length === 0) {
    return;
  }

  return await Promise.allSettled([
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
        id: workspace.id,
      },
      data: {
        totalLinks: { decrement: links.length },
      },
    }),

    enqueueCouponCodeDeletionJobs({ links }),
  ]);
}
