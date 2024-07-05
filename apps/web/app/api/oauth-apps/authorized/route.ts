import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/oauth-apps/authorized - applications authorized to access workspace resources
export const GET = withWorkspace(
  async ({ workspace }) => {
    const appsAuthorized = await prisma.oAuthAuthorizedApp.findMany({
      where: {
        projectId: workspace.id,
      },
      select: {
        id: true,
        createdAt: true,
        oAuthClient: {
          select: {
            clientId: true,
            name: true,
            developer: true,
            website: true,
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

    return NextResponse.json(appsAuthorized);
  },
  {
    requiredScopes: ["workspaces.read"],
  },
);
