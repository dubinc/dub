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

// GET /api/domains/search-availability - search the domain
export const GET = withWorkspace(
  async ({ searchParams }) => {
    const { domain } = schema.parse(searchParams);

    return NextResponse.json(await searchDomainsAvailability({ domain }));
  },
  {
    requiredPermissions: ["domains.read"],
  },
);
