import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createWebhook } from "@/lib/webhook/create-webhook";
import { getWebhooks } from "@/lib/webhook/get-webhooks";
import { identifyWebhookReceiver } from "@/lib/webhook/utils";
import { validateWebhook } from "@/lib/webhook/validate-webhook";
import { createWebhookSchema, WebhookSchema } from "@/lib/zod/schemas/webhooks";
import { sendEmail } from "@dub/email";
import WebhookAdded from "@dub/email/templates/webhook-added";
import { ZAPIER_INTEGRATION_ID } from "@dub/utils/src/constants";
import { WebhookReceiver } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/webhooks - get all webhooks for the given workspace
export const GET = withWorkspace(
  async ({ workspace }) => {
    const webhooks = await getWebhooks({
      workspaceId: workspace.id,
    });

    return NextResponse.json(
      webhooks.map((webhook) => WebhookSchema.parse(webhook)),
    );
  },
  {
    requiredPermissions: ["webhooks.read"],
    requiredPlan: ["business", "advanced", "enterprise"],
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

    const { name, url, triggers, linkScope, linkIds, folderIds } = input;

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
      linkScope,
      linkIds,
      folderIds,
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
    );

    return NextResponse.json(WebhookSchema.parse(webhook), { status: 201 });
  },
  {
    requiredPermissions: ["webhooks.write"],
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
