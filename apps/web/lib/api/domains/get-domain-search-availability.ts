import { searchDomainsAvailability } from "@/lib/dynadot/search-domains";
import { prisma } from "@/lib/prisma";

export async function getDomainSearchAvailability(domain: string) {
  const domainOnDub = await prisma.domain.findUnique({
    where: {
      slug: domain,
      verified: true,
    },
  });

  if (domainOnDub) {
    return [
      {
        domain: domainOnDub.slug,
        available: false,
        premium: false,
        prices: null,
        price: null,
      },
    ];
  }

  return searchDomainsAvailability({
    domains: {
      domain0: domain,
      domain1: `get${domain}`,
      domain2: `try${domain}`,
      domain3: `use${domain}`,
    },
  });
}
