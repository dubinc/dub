import { withWorkspace } from "@/lib/auth";
import { searchDomainsAvailability } from "@/lib/dynadot/search-domains";
import { ratelimit } from "@/lib/upstash";
import z from "@/lib/zod";
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

    return NextResponse.json(await searchDomainsAvailability({ domain }));
  },
  {
    requiredPermissions: ["domains.read"],
  },
);
