import { withWorkspace } from "@/lib/auth";
import { searchDomainsAvailability } from "@/lib/dynadot/search-domains";
import { ratelimit } from "@/lib/upstash";
import z from "@/lib/zod";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

const schema = z.object({
  domain: z
    .string()
    .min(1)
    .endsWith(".link")
    .transform((domain) => domain.toLowerCase())
    .describe("We only support .link domains for now."),
});

// GET /api/domains/search-availability - search the domain
export const GET = withWorkspace(
  async ({ searchParams }) => {
    const { domain } = schema.parse(searchParams);

    // max 1 requests per 5s
    const { success } = await ratelimit(1, "5 s").limit(
      `domain-search:${domain}`,
    );

    if (!success) {
      return new Response("Don't DDoS me pls 🥺", { status: 429 });
    }

    // check if the domain is already registered on Dub
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
        domain1: `get${domain}`,
        domain2: `try${domain}`,
        domain3: `use${domain}`,
      },
    });

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["domains.read"],
  },
);
