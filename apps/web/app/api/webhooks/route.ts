import { DubApiError } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { webhookCache } from "@/lib/webhook/cache";
import { createWebhook } from "@/lib/webhook/create-webhook";
import { getWebhooks } from "@/lib/webhook/get-webhooks";
import { transformWebhook } from "@/lib/webhook/transform";
import { toggleWebhooksForWorkspace } from "@/lib/webhook/update-webhook";
import {
  identifyWebhookReceiver,
  isLinkLevelWebhook,
} from "@/lib/webhook/utils";
import { validateWebhook } from "@/lib/webhook/validate-webhook";
import { createWebhookSchema } from "@/lib/zod/schemas/webhooks";
import { sendEmail } from "@dub/email";
import WebhookAdded from "@dub/email/templates/webhook-added";
import { prisma } from "@dub/prisma";
import { WebhookReceiver } from "@dub/prisma/client";
import { ZAPIER_INTEGRATION_ID } from "@dub/utils/src/constants";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/webhooks - get all webhooks for the given workspace
export const GET = withWorkspace(
  async ({ workspace }) => {
    const webhooks = await getWebhooks({
      workspaceId: workspace.id,
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
    const input = createWebhookSchema.parse(await parseRequestBody(req));

    await validateWebhook({
      input,
      workspace,
      user: session.user,
    });

    const { name, url, triggers, linkIds, secret } = input;

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
      (async () => {
        const links = await prisma.link.findMany({
          where: {
            id: { in: linkIds },
            projectId: workspace.id,
          },
          include: {
            webhooks: {
              select: {
                webhookId: true,
              },
            },
          },
        });

        await Promise.allSettled([
          toggleWebhooksForWorkspace({
            workspaceId: workspace.id,
          }),
          sendEmail({
            to: session.user.email,
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
          ...(links && links.length > 0 ? [linkCache.mset(links), []] : []),

          ...(isLinkLevelWebhook(webhook) ? [webhookCache.set(webhook)] : []),
        ]);
      })(),
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
