import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { webhookCache } from "@/lib/webhook/cache";
import { transformWebhook } from "@/lib/webhook/transform";
import { updateWebhookSchema } from "@/lib/zod/schemas/webhooks";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/webhooks/[webhookId] - get info about a specific webhook
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { webhookId } = params;

    const webhook = await prisma.webhook.findUniqueOrThrow({
      where: {
        id: webhookId,
        projectId: workspace.id,
      },
      select: {
        id: true,
        name: true,
        url: true,
        secret: true,
        triggers: true,
        links: true,
      },
    });

    return NextResponse.json(transformWebhook(webhook));
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

// PATCH /api/webhooks/[webhookId] - update a specific webhook
export const PATCH = withWorkspace(
  async ({ workspace, params, req }) => {
    const { webhookId } = params;

    const { name, url, triggers, linkIds } = updateWebhookSchema.parse(
      await parseRequestBody(req),
    );

    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        projectId: workspace.id,
        url,
        id: {
          not: webhookId,
        },
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
      });

      if (links.length !== linkIds.length) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "Invalid link IDs provided. Please check the links you are adding the webhook to.",
        });
      }
    }

    const webhook = await prisma.webhook.update({
      where: {
        id: webhookId,
        projectId: workspace.id,
      },
      data: {
        ...(name && { name }),
        ...(url && { url }),
        ...(triggers && { triggers }),
        ...(linkIds && {
          links: {
            deleteMany: {},
            create: linkIds.map((linkId) => ({
              linkId,
            })),
          },
        }),
      },
      select: {
        id: true,
        name: true,
        url: true,
        secret: true,
        triggers: true,
        links: true,
      },
    });

    waitUntil(webhookCache.set(webhook));

    return NextResponse.json(transformWebhook(webhook));
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

// DELETE /api/webhooks/[webhookId] - delete a specific webhook
export const DELETE = withWorkspace(
  async ({ workspace, params }) => {
    const { webhookId } = params;

    await prisma.webhook.delete({
      where: {
        id: webhookId,
        projectId: workspace.id,
      },
    });

    const webhooksCount = await prisma.webhook.count({
      where: {
        projectId: workspace.id,
      },
    });

    // Disable webhooks for the workspace if there are no more webhooks
    if (webhooksCount === 0) {
      await prisma.project.update({
        where: {
          id: workspace.id,
        },
        data: {
          webhookEnabled: false,
        },
      });
    }

    waitUntil(webhookCache.delete(webhookId));

    return NextResponse.json({
      id: webhookId,
    });
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
