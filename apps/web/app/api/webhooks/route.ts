import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transformWebhook } from "@/lib/webhook/utils";
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
      select: {
        id: true,
        name: true,
        url: true,
        secret: true,
        triggers: true,
        linkWebhooks: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(webhooks.map(transformWebhook));
  },
  {
    requiredPermissions: ["webhooks.read"],
    featureFlag: "webhooks",
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "enterprise",
    ],
  },
);

// POST /api/webhooks/ - create a new webhook
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    const { name, url, secret, triggers, linkIds } = createWebhookSchema.parse(
      await parseRequestBody(req),
    );

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

    if (linkIds && linkIds.length > 0) {
      const links = await prisma.link.findMany({
        where: {
          id: { in: linkIds },
          projectId: workspace.id,
        },
        select: {
          id: true,
        },
      });

      if (links.length !== linkIds.length) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "Invalid link IDs provided. Please check the links you are adding the webhook to.",
        });
      }
    }

    const webhook = await prisma.webhook.create({
      data: {
        name,
        url,
        secret,
        triggers,
        projectId: workspace.id,
        receiver: "user",
        linkWebhooks: {
          ...(linkIds &&
            linkIds.length > 0 && {
              create: linkIds.map((linkId) => ({
                linkId,
              })),
            }),
        },
      },
      select: {
        id: true,
        name: true,
        url: true,
        secret: true,
        triggers: true,
        linkWebhooks: true,
      },
    });

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

    return NextResponse.json(transformWebhook(webhook), { status: 201 });
  },
  {
    requiredPermissions: ["webhooks.write"],
    featureFlag: "webhooks",
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "enterprise",
    ],
  },
);
