import { withWorkspace } from "@/lib/auth";
import { searchDomainsAvailability } from "@/lib/dynadot/search-domains";
import { searchDomainSchema } from "@/lib/zod/schemas/domains";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/domains/status - checks the availability status of a single domain
export const GET = withWorkspace(
  async ({ searchParams }) => {
    const { domain } = searchDomainSchema.parse(searchParams);

    const domainOnDub = await prisma.domain.findUnique({
      where: {
        slug: domain,
        verified: true,
      },
    });

    if (domainOnDub) {
      return NextResponse.json([
        {
          domain: domainOnDub.slug,
          available: false,
          price: null,
        },
      ]);
    }

    // search for the domain on Dynadot
    const response = await searchDomainsAvailability({
      domains: {
        domain0: domain,
      },
    });

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["domains.read"],
    requiredPlan: ["enterprise"],
  },
);
