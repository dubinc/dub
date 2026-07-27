import { deleteLinks } from "@/lib/api/links/delete-links";
import { prisma } from "@/lib/prisma";
import {
  DeleteWorkspacePayload,
  enqueueNextWorkspaceDeleteStep,
} from "./utils";

const MAX_LINKS_PER_BATCH = 100;

export async function deleteWorkspaceLinks(payload: DeleteWorkspacePayload) {
  const { workspaceId } = payload;

  const links = await prisma.link.findMany({
    where: {
      projectId: workspaceId,
    },
    orderBy: {
      id: "asc",
    },
    take: MAX_LINKS_PER_BATCH,
  });

  if (links.length > 0) {
    await deleteLinks(links);
  }

  return await enqueueNextWorkspaceDeleteStep({
    payload,
    currentStep: "delete-links",
    nextStep: "delete-domains",
    items: links,
    maxBatchSize: MAX_LINKS_PER_BATCH,
  });
}
