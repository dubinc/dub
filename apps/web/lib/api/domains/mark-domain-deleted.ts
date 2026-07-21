import { domainDeletedJob } from "@/lib/jobs/handlers/domain-deleted-job";
import { prisma } from "@/lib/prisma";
import { removeDomainFromVercel } from "./remove-domain-vercel";

// Mark the domain as deleted
// We'll delete the domain and its links via a background job
export async function markDomainAsDeleted({ domain }: { domain: string }) {
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

  await domainDeletedJob.dispatch(
    {
      domain,
    },
    {
      label: domain,
    },
  );

  response.forEach((promise) => {
    if (promise.status === "rejected") {
      console.error("markDomainAsDeleted", {
        reason: promise.reason,
        domain,
      });
    }
  });
}
