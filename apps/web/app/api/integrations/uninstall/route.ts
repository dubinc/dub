// GET /api/integrations/[slug]/installation - get an installation by slug

import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// DELETE /api/integrations/[slug]/installation - delete an installation by slug
export const DELETE = withWorkspace(
  async ({ searchParams, workspace }) => {
    const { installationId } = searchParams;

    const installation = await prisma.oAuthAuthorizedApp.findUnique({
      where: {
        id: installationId,
      },
    });

    if (!installation) {
      throw new DubApiError({
        code: "not_found",
        message: "Integration not found",
      });
    }

    await prisma.$transaction([
      prisma.oAuthAuthorizedApp.delete({
        where: {
          id: installationId,
        },
      }),
      prisma.restrictedToken.delete({
        where: {
          userId_projectId_clientId: {
            userId: installation.userId,
            projectId: workspace.id,
            clientId: installation.clientId,
          },
        },
      }),
    ]);

    return NextResponse.json({ id: installationId });
  },
  {
    requiredPermissions: ["integrations.write"],
  },
);
