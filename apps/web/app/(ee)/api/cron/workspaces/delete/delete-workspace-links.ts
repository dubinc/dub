import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { prisma } from "@dub/prisma";
import {
  DeleteWorkspacePayload,
  enqueueNextWorkspaceDeleteStep,
} from "./utils";

const MAX_LINKS_PER_BATCH = 100;

export async function deleteWorkspaceLinks(payload: DeleteWorkspacePayload) {
  const { workspaceId, startingAfter } = payload;

  const links = await prisma.link.findMany({
    where: {
      projectId: workspaceId,
    },
    orderBy: {
      id: "asc",
    },
    ...(startingAfter && {
      skip: 1,
      cursor: {
        id: startingAfter,
      },
    }),
    take: MAX_LINKS_PER_BATCH,
  });

  if (links.length > 0) {
    const deletedLinks = await prisma.link.deleteMany({
      where: {
        id: {
          in: links.map(({ id }) => id),
        },
      },
    });

    console.log(
      `Deleted ${deletedLinks.count} links for workspace ${workspaceId}.`,
    );

    await bulkDeleteLinks(links);
  }

  return await enqueueNextWorkspaceDeleteStep({
    payload,
    currentStep: "delete-links",
    nextStep: "delete-domains",
    items: links,
    maxBatchSize: MAX_LINKS_PER_BATCH,
  });
}
