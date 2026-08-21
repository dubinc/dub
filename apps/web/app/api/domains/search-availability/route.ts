import { getDomainSearchAvailability } from "@/lib/api/domains/get-domain-search-availability";
import { withWorkspace } from "@/lib/auth";
import { ratelimit } from "@/lib/upstash";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const schema = z.object({
  domain: z
    .string()
    .trim()
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

    const response = await getDomainSearchAvailability(domain);

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["domains.read"],
  },
);
