import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { searchDomainsAvailability } from "@/lib/dynadot/search-domains";
import {
  DomainStatusSchema,
  searchDomainSchema,
} from "@/lib/zod/schemas/domains";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/domains/status - checks the availability status of one or more domains
export const GET = withWorkspace(
  async ({ searchParams }) => {
    let { domains } = searchDomainSchema.parse(searchParams);

    if (domains.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "You must provide at least one domain to check. We only support .link domains for now.",
      });
    }

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

    let response: z.infer<typeof DomainStatusSchema>[] = [];

    // if all domains are already registered on Dub, return the status for all domains as false
    if (domainsOnDub.length > 0) {
      response = DomainStatusSchema.array().parse(
        domainsOnDub.map(({ slug: domain }) => ({
          domain,
          available: false,
          price: null,
          premium: null,
        })),
      );
    }

    domains = domains.filter(
      (domain) => !domainsOnDub.some((d) => d.slug === domain),
    );

    if (domains.length > 0) {
      const domainsToSearch = domains.reduce(
        (acc, domain, index) => {
          acc[`domain${index}`] = domain;
          return acc;
        },
        {} as Record<string, string>,
      );

      const searchResponse = await searchDomainsAvailability({
        domains: domainsToSearch,
      });

      response = response.concat(searchResponse);
    }

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["domains.read"],
    requiredPlan: ["enterprise"],
  },
);
