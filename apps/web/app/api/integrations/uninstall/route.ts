import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { uninstallSlackIntegration } from "@/lib/integrations/slack/uninstall";
import { webhookCache } from "@/lib/webhook/cache";
import { isLinkLevelWebhook } from "@/lib/webhook/utils";
import { prisma } from "@dub/prisma";
import { SLACK_INTEGRATION_ID } from "@dub/utils";
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

    const { integrationId, webhook } = await prisma.installedIntegration.delete(
      {
        where: {
          id: installationId,
        },
        select: {
          integrationId: true,
          webhook: {
            select: {
              id: true,
              triggers: true,
            },
          },
        },
      },
    );

    waitUntil(
      Promise.all([
        ...(integrationId === SLACK_INTEGRATION_ID
          ? [uninstallSlackIntegration({ installation })]
          : []),

        ...(webhook && isLinkLevelWebhook(webhook)
          ? [webhookCache.delete(webhook.id)]
          : []),
      ]),
    );

    return NextResponse.json({ id: installationId });
  },
  {
    requiredPermissions: ["integrations.write"],
  },
);
