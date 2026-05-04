import { prisma } from "@dub/prisma";
import { queueLinkTagDeletion } from "./queue-tag-deletion";

// Mark the link tag as deleted (orphan from workspace). LinkTag rows and the
// Tag row are removed asynchronously via a cron job.
export async function markLinkTagDeleted({
  tagId,
  projectId,
}: {
  tagId: string;
  projectId: string;
}): Promise<boolean> {
  try {
    const updated = await prisma.tag.update({
      where: {
        id: tagId,
        projectId,
      },
      data: {
        projectId: null,
      },
    });

    if (!updated) {
      return false;
    }

    await queueLinkTagDeletion({
      tagId,
    });

    return true;
  } catch (error) {
    console.error("markLinkTagDeleted", {
      reason: error,
      tagId,
      projectId,
    });
    return false;
  }
}
