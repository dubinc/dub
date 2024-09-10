import { createLink } from "@/lib/api/links";
import { withWorkspace } from "@/lib/auth";
import { configureDNS } from "@/lib/dynadot/configure-dns";
import { registerDomain } from "@/lib/dynadot/register-domain";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { DEFAULT_LINK_PROPS } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
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
  async ({ searchParams, workspace, session }) => {
    if (workspace.plan === "free")
      throw new Error("Free workspaces cannot register .link domains.");

    const { domain } = schema.parse(searchParams);

    const existingDotLinkDomain = await prisma.domain.findFirst({
      where: {
        projectId: workspace.id,
        slug: {
          endsWith: ".link",
        },
      },
    });

    if (existingDotLinkDomain)
      throw new Error("Workspace is limited to one .link domain.");

    const response = await registerDomain({ domain });
    const slug = response.RegisterResponse.DomainName;

    const totalDomains = await prisma.domain.count({
      where: {
        projectId: workspace.id,
      },
    });

    await Promise.all([
      // Create the workspace domain
      prisma.domain.create({
        data: {
          projectId: workspace.id,
          slug,
          verified: true,
          lastChecked: new Date(),
          primary: totalDomains === 0,
          registeredDomain: {
            create: {
              slug,
              expiresAt: new Date(response.RegisterResponse.Expiration),
              projectId: workspace.id,
            },
          },
        },
      }),
      // Create the root link
      createLink({
        ...DEFAULT_LINK_PROPS,
        domain: slug,
        key: "_root",
        url: "",
        tags: undefined,
        userId: session.user.id,
        projectId: workspace.id,
      }),
    ]);

    // Configure the DNS in the background
    waitUntil(configureDNS({ domain: slug }));

    return NextResponse.json(response);
  },
  {
    requiredPermissions: ["domains.write"],
  },
);
