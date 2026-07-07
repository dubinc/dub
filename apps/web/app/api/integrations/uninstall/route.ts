import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { getIntegrationProvider } from "@/lib/integrations/integration-providers";
import { slackOAuthProvider } from "@/lib/integrations/slack/oauth";
import { prisma } from "@/lib/prisma";
import { SLACK_INTEGRATION_ID } from "@dub/utils/src/constants/integrations";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// DELETE /api/integrations/uninstall - uninstall an installation by id
export const DELETE = withWorkspace(
  async ({ searchParams, session, workspace }) => {
    const { installationId } = searchParams;

    const installation = await prisma.installedIntegration.findUnique({
      where: {
        id: installationId,
        projectId: workspace.id,
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

    const { integrationId } = await prisma.installedIntegration.delete({
      where: {
        id: installationId,
      },
      select: {
        integrationId: true,
      },
    });

    const integrationProvider = getIntegrationProvider(integrationId);

    let uninstallPromise: Promise<unknown> = Promise.resolve();

    if (integrationId === SLACK_INTEGRATION_ID) {
      uninstallPromise = slackOAuthProvider.uninstall(installation);
    } else if (integrationProvider) {
      uninstallPromise = integrationProvider.uninstall(installation);
    }

    waitUntil(uninstallPromise);

    return NextResponse.json({ id: installationId });
  },
  {
    requiredPermissions: ["integrations.write"],
  },
);
