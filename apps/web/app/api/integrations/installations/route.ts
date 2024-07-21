import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/integrations/installations - get all installed integrations for a specific workspace
export const GET = withWorkspace(
  async ({ workspace }) => {
    const result = await prisma.oAuthAuthorizedApp.findMany({
      where: {
        projectId: workspace.id,
      },
      select: {
        id: true,
        createdAt: true,
        oAuthApp: {
          select: {
            clientId: true,
            slug: true,
            name: true,
            developer: true,
            website: true,
            logo: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const installedIntegrations = result.map((integration) => ({
      id: integration.id,
      createdAt: integration.createdAt,
      clientId: integration.oAuthApp.clientId,
      name: integration.oAuthApp.name,
      slug: integration.oAuthApp.slug,
      developer: integration.oAuthApp.developer,
      website: integration.oAuthApp.website,
      logo: integration.oAuthApp.logo,
      user: {
        id: integration.user.id,
        name: integration.user.name,
      },
    }));

    return NextResponse.json(installedIntegrations);
  },
  {
    requiredPermissions: ["integrations.read"],
  },
);
