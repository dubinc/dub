import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/integrations - get all active integrations
export const GET = withWorkspace(
  async ({ workspace }) => {
    const integrations = await prisma.oAuthApp.findMany({
      select: {
        clientId: true,
        name: true,
        slug: true,
      },
      where: {
        verified: true,
        authorizedApps: {
          some: {
            project: {
              slug: workspace.slug,
            },
          },
        },
      },
    });

    return NextResponse.json(integrations);
  },
  {
    requiredPermissions: ["workspaces.read"],
    featureFlag: "integrations",
  },
);
