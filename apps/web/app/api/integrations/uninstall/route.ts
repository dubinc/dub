import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { uninstallSlackIntegration } from "@/lib/integrations/slack/uninstall";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// DELETE /api/integrations/uninstall - uninstall an installation by id
export const DELETE = withWorkspace(
  async ({ searchParams, session }) => {
    const { installationId } = searchParams;

    const installation = await prisma.installedIntegration.findUnique({
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

    if (installation.userId !== session.user.id) {
      throw new DubApiError({
        code: "unauthorized",
        message:
          "You are not authorized to uninstall this integration. Only the user who installed it can uninstall it.",
      });
    }

    await prisma.installedIntegration.delete({
      where: {
        id: installationId,
      },
    });

    const integration = await prisma.integration.findUniqueOrThrow({
      where: {
        id: installation.integrationId,
      },
    });

    if (integration.slug === "slack") {
      await uninstallSlackIntegration({
        installation,
      });
    }

    return NextResponse.json({ id: installationId });
  },
  {
    requiredPermissions: ["integrations.write"],
  },
);
