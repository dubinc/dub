import { prisma } from "@/lib/prisma";
import { removeDomainFromVercel } from "./remove-domain-vercel";

export const deleteDomain = async (domain: string) => {
  const [domainResponse, vercelResponse] = await Promise.allSettled([
    removeDomainFromVercel(domain),

    prisma.domain.findUnique({
      where: {
        slug: domain,
      },
    }),
  ]);

  if (domainResponse.status === "rejected") {
    console.error("Error removing domain from Vercel:", {
      domain,
      reason: domainResponse.reason,
    });
  }

  if (vercelResponse.status === "rejected") {
    console.error("Error deleting domain from database:", {
      domain,
      reason: vercelResponse.reason,
    });
  }
};
