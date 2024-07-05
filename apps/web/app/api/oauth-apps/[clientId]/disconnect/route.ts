import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// DELETE /api/oauth-clients/[clientId]/disconnect - Disconnect an authorized OAuth app from the workspace
export const DELETE = withWorkspace(
  async ({ params, workspace, session }) => {
    const { clientId } = params;
    const { id: userId } = session.user;
    const { id: projectId } = workspace;

    await prisma.$transaction([
      prisma.oAuthAuthorizedApp.delete({
        where: {
          userId_projectId_clientId: {
            userId,
            projectId,
            clientId,
          },
        },
      }),

      prisma.restrictedToken.delete({
        where: {
          userId_projectId_clientId: {
            userId,
            projectId,
            clientId,
          },
        },
      }),
    ]);

    return NextResponse.json({ id: params.clientId });
  },
  {
    requiredScopes: ["oauth_apps.write"],
  },
);
