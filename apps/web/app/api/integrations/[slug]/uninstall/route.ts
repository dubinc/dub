// GET /api/integrations/[slug]/installation - get an installation by slug

import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// DELETE /api/integrations/[slug]/installation - delete an installation by slug
export const DELETE = withWorkspace(
  async ({ params, workspace }) => {
    const integration = await prisma.oAuthAuthorizedApp.findFirst({
      where: {
        projectId: workspace.id,
        oAuthApp: {
          slug: params.slug,
        },
      },
      select: {
        id: true,
        clientId: true,
        userId: true,
      },
    });

    if (!integration) {
      throw new DubApiError({
        code: "not_found",
        message: "Integration not found",
      });
    }

    await prisma.$transaction([
      prisma.oAuthAuthorizedApp.delete({
        where: {
          id: integration.id,
        },
      }),
      prisma.restrictedToken.delete({
        where: {
          userId_projectId_clientId: {
            userId: integration.userId,
            projectId: workspace.id,
            clientId: integration.clientId,
          },
        },
      }),
    ]);

    return NextResponse.json({ id: params.clientId });
  },
  {
    requiredPermissions: ["integrations.write"],
  },
);
