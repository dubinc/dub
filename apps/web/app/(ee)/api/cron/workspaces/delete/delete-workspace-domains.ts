import { removeDomainFromVercel } from "@/lib/api/domains/remove-domain-vercel";
import { prisma } from "@dub/prisma";
import {
  DeleteWorkspacePayload,
  enqueueNextWorkspaceDeleteStep,
} from "./utils";

const MAX_DOMAINS_PER_BATCH = 10;

export async function deleteWorkspaceDomains(payload: DeleteWorkspacePayload) {
  const { workspaceId, startingAfter } = payload;

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

  if (domains.length > 0) {
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

    await Promise.allSettled(
      domains.map(({ slug }) => removeDomainFromVercel(slug)),
    );
  }

  return await enqueueNextWorkspaceDeleteStep({
    payload,
    currentStep: "delete-domains",
    nextStep: "delete-folders",
    items: domains,
    maxBatchSize: MAX_DOMAINS_PER_BATCH,
  });
}
