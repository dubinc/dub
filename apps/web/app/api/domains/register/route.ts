import { withWorkspace } from "@/lib/auth";
import { searchDomains } from "@/lib/dynadot/search-domains";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const schema = z.object({
  domain: z.string().min(1),
});

// GET /api/domains/claim - claim the domain
export const POST = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { domain } = schema.parse(searchParams);

    const searchResult = await searchDomains({ domain });
    
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
