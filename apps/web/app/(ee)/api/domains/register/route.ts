import { claimDotLinkDomain } from "@/lib/api/domains/claim-dot-link-domain";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { registerDomainSchema } from "@/lib/zod/schemas/domains";
import { NextResponse } from "next/server";

// POST /api/domains/register - register a domain
export const POST = withWorkspace(
  async ({ workspace, session, req }) => {
    const { domain } = registerDomainSchema.parse(await parseRequestBody(req));

    const response = await claimDotLinkDomain({
      domain,
      workspace,
      userId: session.user.id,
      skipWorkspaceChecks: true,
    });

    return NextResponse.json(response, { status: 201 });
  },
  {
    requiredPermissions: ["domains.write"],
    requiredPlan: ["enterprise"],
  },
);
