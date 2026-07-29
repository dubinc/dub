import { domainDeletedJob } from "@/lib/jobs/handlers/domain-deleted-job";
import { prisma } from "@/lib/prisma";

// Mark the domain as deleted
// We'll delete the domain and its links via a background job
export async function markDomainAsDeleted({ domain }: { domain: string }) {
  await prisma.domain.update({
    where: {
      slug: domain,
    },
    data: {
      projectId: null,
    },
  });

  await domainDeletedJob.dispatch(
    {
      domain,
    },
    {
      label: domain,
    },
  );
}
