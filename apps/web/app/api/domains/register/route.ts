import { withWorkspace } from "@/lib/auth";
import { registerDomain } from "@/lib/dynadot/register-domain";
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
  async ({ searchParams }) => {
    const { domain } = schema.parse(searchParams);

    const response = await registerDomain({ domain });

    // TODO:
    // Add domain to the workspace if registration is successful
    // Add DNS records to the domain if registration is successful (in the background)

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["domains.write"],
  },
);
