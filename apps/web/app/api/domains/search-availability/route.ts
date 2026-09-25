import { getDomainSearchAvailability } from "@/lib/api/domains/get-domain-search-availability";
import { withWorkspace } from "@/lib/auth";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
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

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.domainSearchAvailability,
      identifier: domain,
    });

    const response = await getDomainSearchAvailability(domain);

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["domains.read"],
  },
);
