import { getDomainSearchAvailability } from "@/lib/api/domains/get-domain-search-availability";
import { withWorkspace } from "@/lib/auth";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// A registrable .link name has one label before .link. The label is at most 60 characters,
// so the "get", "try" and "use" variants that the search also checks stay within the 63-character label limit.
const LINK_DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?\.link$/i;

const schema = z.object({
  domain: z
    .string()
    .trim()
    .min(1)
    .endsWith(".link")
    .refine((domain) => LINK_DOMAIN_REGEX.test(domain), {
      message: "Please enter a valid domain, for example acme.link.",
    })
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
