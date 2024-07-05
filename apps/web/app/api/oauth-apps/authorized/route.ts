import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/oauth-apps/authorized - applications authorized to access workspace resources
export const GET = withWorkspace(
  async ({ workspace }) => {
    const appsAuthorized = await prisma.oAuthClient.findMany({
      where: {
        accessTokens: {
          some: {
            projectId: workspace.id,
          },
        },
      },
      select: {
        clientId: true,
        name: true,
        developer: true,
        website: true,
        scopes: true,
        createdAt: true,
      },
    });

    console.log(appsAuthorized);

    return NextResponse.json(appsAuthorized);
  },
  {
    requiredScopes: ["workspaces.read"],
  },
);
