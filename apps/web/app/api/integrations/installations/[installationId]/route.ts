import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// DELETE /api/integrations/installations/[installationId] - Uninstall an integration from the workspace
export const DELETE = withWorkspace(
  async ({ params, workspace, session }) => {
    const uninstalledIntegration = await prisma.oAuthAuthorizedApp.delete({
      where: {
        id: params.installationId,
      },
      select: {
        oAuthApp: {
          select: {
            clientId: true,
          },
        },
      },
    });

    // TODO: refactor to just delete by installationId
    await prisma.restrictedToken.delete({
      where: {
        userId_projectId_clientId: {
          userId: session.user.id,
          projectId: workspace.id,
          clientId: uninstalledIntegration.oAuthApp.clientId,
        },
      },
    });

    return NextResponse.json({ id: params.clientId });
  },
  {
    requiredPermissions: ["integrations.disconnect"],
  },
);
