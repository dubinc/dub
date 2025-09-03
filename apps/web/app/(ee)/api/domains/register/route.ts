import { claimDotLinkDomain } from "@/lib/api/domains/claim-dot-link-domain";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { registerDomainSchema } from "@/lib/zod/schemas/domains";
import { NextResponse } from "next/server";

// TODO: this logic is hard-coded for now, but we'll make it dynamic in the future
const eligibleWorkspaces = [
  "clrei1gld0002vs9mzn93p8ik",
  "ws_1JT00MX4K1KQFMT2FEF6413XT",
];

// POST /api/domains/register - register a domain
export const POST = withWorkspace(
  async ({ workspace, session, req }) => {
    const { domain } = registerDomainSchema.parse(await parseRequestBody(req));

    if (!eligibleWorkspaces.includes(workspace.id)) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "Your workspace is not eligible for domain registration. Contact support@dub.co for more information.",
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
