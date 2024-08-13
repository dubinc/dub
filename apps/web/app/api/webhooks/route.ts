import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createWebhookSchema } from "@/lib/zod/schemas/webhooks";
import { waitUntil } from "@vercel/functions";
import { sendEmail } from "emails";
import WebhookAdded from "emails/webhook-added";
import { NextResponse } from "next/server";

// GET /api/webhooks - get all webhooks for the given workspace
export const GET = withWorkspace(
  async ({ workspace }) => {
    const webhooks = await prisma.webhook.findMany({
      where: {
        projectId: workspace.id,
      },
    });

    return NextResponse.json(webhooks);
  },
  {
    requiredPermissions: ["webhooks.read"],
  },
);

// POST /api/webhooks/ - create a new webhook
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    const { name, url, secret, triggers } = createWebhookSchema.parse(
      await parseRequestBody(req),
    );

    const webhook = await prisma.webhook.create({
      data: {
        name,
        url,
        secret,
        triggers,
        projectId: workspace.id,
        source: "user",
      },
    });

    // Enable webhooks for the workspace
    if (webhook) {
      await prisma.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          webhookEnabled: true,
        },
      });
    }

    waitUntil(
      // Inform the workspace user that the webhook was added
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
    );

    return NextResponse.json(webhook, { status: 201 });
  },
  {
    requiredPermissions: ["webhooks.write"],
  },
);
