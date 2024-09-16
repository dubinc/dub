import { claimDotLinkDomain } from "@/lib/api/domains/claim-dot-link-domain";
import { withWorkspace } from "@/lib/auth";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const schema = z.object({
  domain: z
    .string()
    .min(1)
    .endsWith(".link")
    .transform((domain) => domain.toLowerCase())
    .describe("The domain to claim. We only support .link domains for now."),
});

// POST /api/domains/register - register a domain
export const POST = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    const { domain } = schema.parse(searchParams);

    const response = await claimDotLinkDomain({
      domain,
      workspace,
      userId: session.user.id,
    });

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["domains.write"],
  },
);
