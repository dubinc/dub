import { withWorkspace } from "@/lib/auth";
import { searchDomainsAvailability } from "@/lib/dynadot/search-domains";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const schema = z.object({
  domain: z
    .string()
    .min(1)
    .endsWith(".link")
    .describe("We only support .link domains for now."),
});

// GET /api/domains/register - register a domain
export const POST = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { domain } = schema.parse(searchParams);

    const searchResult = await searchDomainsAvailability({ domain });

    // TODO:
    // Check domain is available
    // If not available, return error
    // If available, register domain

    return NextResponse.json(searchResult);
  },
  {
    requiredPermissions: ["domains.read"],
  },
);
