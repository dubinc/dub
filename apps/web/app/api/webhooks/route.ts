import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { getFolders } from "@/lib/folder/get-folders";
import { createWebhook } from "@/lib/webhook/create-webhook";
import { transformWebhook } from "@/lib/webhook/transform";
import { toggleWebhooksForWorkspace } from "@/lib/webhook/update-webhook";
import { identifyWebhookReceiver } from "@/lib/webhook/utils";
import { createWebhookSchema } from "@/lib/zod/schemas/webhooks";
import { sendEmail } from "@dub/email";
import { WebhookAdded } from "@dub/email/templates/webhook-added";
import { prisma } from "@dub/prisma";
import { WebhookReceiver } from "@dub/prisma/client";
import { ZAPIER_INTEGRATION_ID } from "@dub/utils/src/constants";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/webhooks - get all webhooks for the given workspace
export const GET = withWorkspace(
  async ({ workspace }) => {
    const webhooks = await prisma.webhook.findMany({
      where: {
        projectId: workspace.id,
      },
      select: {
        id: true,
        name: true,
        url: true,
        secret: true,
        triggers: true,
        disabledAt: true,
        links: true,
        receiver: true,
        installationId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(webhooks.map(transformWebhook));
  },
  {
    requiredPermissions: ["webhooks.read"],
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);

// POST /api/webhooks/ - create a new webhook
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    const { name, url, triggers, linkIds, excludeLinkIds, secret } =
      createWebhookSchema.parse(await parseRequestBody(req));

    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        url,
        projectId: workspace.id,
      },
    });

    if (existingWebhook) {
      throw new DubApiError({
        code: "conflict",
        message: "A Webhook with this URL already exists.",
      });
    }

    const allLinkIds = [...(linkIds || []), ...(excludeLinkIds || [])];

    if (allLinkIds.length > 0) {
      const folders = await getFolders({
        workspaceId: workspace.id,
        userId: session.user.id,
      });

      const links = await prisma.link.findMany({
        where: {
          id: {
            in: allLinkIds,
          },
          projectId: workspace.id,
          OR: [
            { folderId: null },
            { folderId: { in: folders.map((folder) => folder.id) } },
          ],
        },
        select: {
          id: true,
        },
      });

      if (links.length !== allLinkIds.length) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "Invalid link IDs provided. Please check the links you are adding the webhook to.",
        });
      }
    }

    // Zapier use this endpoint to create webhooks from their app
    const isZapierWebhook =
      identifyWebhookReceiver(url) === WebhookReceiver.zapier;

    const zapierInstallation = isZapierWebhook
      ? await prisma.installedIntegration.findFirst({
          where: {
            projectId: workspace.id,
            integrationId: ZAPIER_INTEGRATION_ID,
          },
          select: {
            id: true,
          },
        })
      : undefined;

    const webhook = await createWebhook({
      name,
      url,
      receiver: isZapierWebhook ? WebhookReceiver.zapier : WebhookReceiver.user,
      triggers,
      linkIds,
      excludeLinkIds,
      secret,
      workspace,
      installationId: zapierInstallation ? zapierInstallation.id : undefined,
    });

    if (!webhook) {
      throw new DubApiError({
        code: "bad_request",
        message: "Failed to create webhook.",
      });
    }

    waitUntil(
      Promise.all([
        toggleWebhooksForWorkspace({
          workspaceId: workspace.id,
        }),

        sendEmail({
          email: session.user.email,
          subject: "New webhook added",
          react: WebhookAdded({
            email: session.user.email,
            workspace: {
              name: workspace.name,
              slug: workspace.slug,
            },
            webhook: {
              name,
            },
          }),
        }),
      ]),
    );

    return NextResponse.json(transformWebhook(webhook), { status: 201 });
  },
  {
    requiredPermissions: ["webhooks.write"],
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
