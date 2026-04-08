import { claimDotLinkDomain } from "@/lib/api/domains/claim-dot-link-domain";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { DOMAIN_REGISTRATION_ELIGIBLE_WORKSPACES } from "@/lib/dynadot/constants";
import { registerDomainSchema } from "@/lib/zod/schemas/domains";
import { NextResponse } from "next/server";

// POST /api/domains/register - register a domain
export const POST = withWorkspace(
  async ({ workspace, session, req }) => {
    const { domain } = registerDomainSchema.parse(await parseRequestBody(req));

    if (!DOMAIN_REGISTRATION_ELIGIBLE_WORKSPACES.includes(workspace.id)) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "POST /domains/register is not available for your workspace. Contact support for more information.",
      });
    }

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
