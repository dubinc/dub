import { withWorkspace } from "@/lib/auth";
import { searchDomains } from "@/lib/dynadot/search-domains";
import { NextResponse } from "next/server";

// GET /api/domains/search - search the domain
export const GET = withWorkspace(
  async ({ workspace }) => {
    const domains = await searchDomains("test");

    return NextResponse.json(domains);
  },
  {
    requiredPermissions: ["domains.read"],
  },
);
