import { prisma } from "@dub/prisma";
import { queueDomainDeletion } from "./queue";
import { removeDomainFromVercel } from "./remove-domain-vercel";

// Mark the domain as deleted
// We'll delete the domain and its links via a cron job
export async function markDomainAsDeleted({
  domain,
  workspaceId,
  delay,
}: {
  domain: string;
  workspaceId: string;
  delay?: number; // delay the cron job to avoid hitting rate limits
}) {
  const links = await prisma.link.updateMany({
    where: {
      domain,
    },
    data: {
      projectId: null,
    },
  });

  const response = await Promise.allSettled([
    removeDomainFromVercel(domain),

    prisma.domain.update({
      where: {
        slug: domain,
      },
      data: {
        projectId: null,
      },
    }),
  ]);

  await queueDomainDeletion({
    workspaceId,
    domain,
    delay,
  });

  response.forEach((promise) => {
    if (promise.status === "rejected") {
      console.error("markDomainAsDeleted", {
        reason: promise.reason,
        domain,
        workspaceId,
      });
    }
  });
}
