import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { prisma } from "@dub/prisma";
import { logAndRespond } from "../../utils";
import {
  DeleteWorkspacePayload,
  enqueueNextWorkspaceDeleteStep,
} from "./utils";

const MAX_LINKS_PER_BATCH = 100;

export async function deleteWorkspaceLinksBatch(
  payload: DeleteWorkspacePayload,
) {
  const { workspaceId, startingAfter } = payload;

  console.log(`Deleting links for workspace ${workspaceId}...`);

  const workspace = await prisma.project.findUnique({
    where: {
      id: workspaceId,
    },
    select: {
      id: true,
    },
  });

  if (!workspace) {
    return logAndRespond(`Workspace ${workspaceId} not found. Skipping...`);
  }

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

  if (links.length === 0) {
    return logAndRespond(
      `No more links to delete for workspace ${workspaceId}. Skipping...`,
    );
  }

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

  await enqueueNextWorkspaceDeleteStep({
    payload,
    currentStep: "delete-links",
    nextStep: "delete-domains",
    items: links,
    maxBatchSize: MAX_LINKS_PER_BATCH,
  });
}
