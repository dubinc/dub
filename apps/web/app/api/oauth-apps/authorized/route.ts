import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { authorizedAppSchema } from "@/lib/zod/schemas/oauth";
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

    return NextResponse.json(
      z.array(authorizedAppSchema).parse(appsAuthorized),
    );
  },
  {
    requiredScopes: ["workspaces.read"],
  },
);
