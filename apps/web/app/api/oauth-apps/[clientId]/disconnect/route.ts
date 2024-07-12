import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// DELETE /api/oauth-apps/[clientId]/disconnect - Disconnect an authorized OAuth app from the workspace
export const DELETE = withWorkspace(
  async ({ params, workspace, session }) => {
    const prismaArgs = {
      userId_projectId_clientId: {
        userId: session.user.id,
        projectId: workspace.id,
        clientId: params.clientId,
      },
    };

    await prisma.$transaction([
      prisma.oAuthAuthorizedApp.delete({
        where: prismaArgs,
      }),

      prisma.restrictedToken.delete({
        where: prismaArgs,
      }),
    ]);

    return NextResponse.json({ id: params.clientId });
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
