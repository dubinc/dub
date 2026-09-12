import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { googleAdsInstalledWorkspaces } from "@/lib/integrations/google-ads/installed-workspaces";
import { slackOAuthProvider } from "@/lib/integrations/slack/oauth";
import { prisma } from "@/lib/prisma";
import {
  GOOGLE_ADS_INTEGRATION_ID,
  RAYCAST_INTEGRATION_ID,
  SLACK_INTEGRATION_ID,
} from "@dub/utils/src/constants/integrations";
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

    const isInstaller = installation.userId === session.user.id;
    const isOwner = workspace.users[0].role === "owner";
    const isPersonalIntegration =
      installation.integrationId === RAYCAST_INTEGRATION_ID;

    if (!isInstaller && (!isOwner || isPersonalIntegration)) {
      throw new DubApiError({
        code: "unauthorized",
        message: isPersonalIntegration
          ? "You are not authorized to uninstall this integration. Only the user who installed it can uninstall it."
          : "You are not authorized to uninstall this integration. Only the user who installed it or a workspace owner can uninstall it.",
      });
    }

    const { integrationId, webhooks } =
      await prisma.installedIntegration.delete({
        where: {
          id: installationId,
        },
        select: {
          integrationId: true,
          webhooks: {
            select: {
              id: true,
              triggers: true,
            },
          },
        },
      });

    waitUntil(
      Promise.all([
        ...(integrationId === SLACK_INTEGRATION_ID
          ? [slackOAuthProvider.uninstall(installation)]
          : []),
        ...(integrationId === GOOGLE_ADS_INTEGRATION_ID
          ? [googleAdsInstalledWorkspaces.remove(workspace.id)]
          : []),
      ]),
    );

    return NextResponse.json({ id: installationId });
  },
  {
    requiredPermissions: ["integrations.write"],
  },
);
