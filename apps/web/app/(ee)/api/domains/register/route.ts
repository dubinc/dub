import { claimDotLinkDomain } from "@/lib/api/domains/claim-dot-link-domain";
import { withWorkspace } from "@/lib/auth";
import { registerDomainSchema } from "@/lib/zod/schemas/domains";
import { NextResponse } from "next/server";

// POST /api/domains/register - register a domain
export const POST = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    const { domain } = registerDomainSchema.parse(searchParams);

    const response = await claimDotLinkDomain({
      domain,
      workspace,
      userId: session.user.id,
      skipWorkspaceChecks: true,
    });

    // TODO:
    // Check the response

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["domains.write"],
    requiredPlan: ["enterprise"],
  },
);
