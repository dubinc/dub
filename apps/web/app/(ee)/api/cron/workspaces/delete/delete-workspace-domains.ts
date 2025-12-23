import { removeDomainFromVercel } from "@/lib/api/domains/remove-domain-vercel";
import { prisma } from "@dub/prisma";
import { logAndRespond } from "../../utils";
import {
  DeleteWorkspacePayload,
  enqueueNextWorkspaceDeleteStep,
} from "./utils";

const MAX_DOMAINS_PER_BATCH = 100;

export async function deleteWorkspaceDomainsBatch(
  payload: DeleteWorkspacePayload,
) {
  const { workspaceId, startingAfter } = payload;

  console.log(`Deleting domains for workspace ${workspaceId}...`);

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

  const domains = await prisma.domain.findMany({
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
    take: MAX_DOMAINS_PER_BATCH,
  });

  if (domains.length === 0) {
    return logAndRespond(
      `No more domains to delete for workspace ${workspaceId}. Skipping...`,
    );
  }

  const deletedDomains = await prisma.domain.deleteMany({
    where: {
      id: {
        in: domains.map(({ id }) => id),
      },
    },
  });

  console.log(
    `Deleted ${deletedDomains.count} domains for workspace ${workspaceId}.`,
  );

  await Promise.all(domains.map(({ slug }) => removeDomainFromVercel(slug)));

  await enqueueNextWorkspaceDeleteStep({
    payload,
    currentStep: "delete-domains",
    nextStep: "delete-folders",
    items: domains,
    maxBatchSize: MAX_DOMAINS_PER_BATCH,
  });
}
