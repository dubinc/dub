import { withWorkspace } from "@/lib/auth";
import { searchDomainsAvailability } from "@/lib/dynadot/search-domains";
import {
  DomainStatusSchema,
  searchDomainSchema,
} from "@/lib/zod/schemas/domains";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/domains/status - checks the availability status of one or more domains
export const GET = withWorkspace(
  async ({ searchParams }) => {
    let { domains } = searchDomainSchema.parse(searchParams);

    const domainsOnDub = await prisma.domain.findMany({
      where: {
        slug: {
          in: domains,
        },
        verified: true,
      },
      select: {
        slug: true,
      },
    });

    if (domainsOnDub.length === domains.length) {
      return NextResponse.json(
        DomainStatusSchema.array().parse(
          domains.map((domain) => ({
            domain,
            available: false,
            price: null,
            premium: null,
          })),
        ),
      );
    }

    domains = domains.filter(
      (domain) => !domainsOnDub.some((d) => d.slug === domain),
    );

    const domainsToSearch = domains.reduce(
      (acc, domain, index) => {
        acc[`domain${index}`] = domain;
        return acc;
      },
      {} as Record<string, string>,
    );

    // search for the domain on Dynadot
    const response = await searchDomainsAvailability({
      domains: domainsToSearch,
    });

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["domains.read"],
    requiredPlan: ["enterprise"],
  },
);
