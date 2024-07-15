import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/oauth-apps/authorized - applications authorized to access workspace resources
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

    const appsAuthorized = result.map((app) => ({
      id: app.id,
      createdAt: app.createdAt,
      clientId: app.oAuthApp.clientId,
      name: app.oAuthApp.name,
      developer: app.oAuthApp.developer,
      website: app.oAuthApp.website,
      logo: app.oAuthApp.logo,
      user: {
        id: app.user.id,
        name: app.user.name,
      },
    }));

    return NextResponse.json(appsAuthorized);
  },
  {
    requiredPermissions: ["integrations.read"],
  },
);
