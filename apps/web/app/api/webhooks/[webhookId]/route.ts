import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateWebhookSchema } from "@/lib/zod/schemas/webhooks";
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
    });

    return NextResponse.json(webhook);
  },
  {
    requiredPermissions: ["webhooks.read"],
    featureFlag: "webhooks",
  },
);

// PATCH /api/webhooks/[webhookId] - update a specific webhook
export const PATCH = withWorkspace(
  async ({ workspace, params, req }) => {
    const { webhookId } = params;

    const { name, url, triggers } = updateWebhookSchema.parse(
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

    const webhook = await prisma.webhook.update({
      where: {
        id: webhookId,
        projectId: workspace.id,
      },
      data: {
        ...(name && { name }),
        ...(url && { url }),
        ...(triggers && { triggers }),
      },
    });

    return NextResponse.json(webhook);
  },
  {
    requiredPermissions: ["webhooks.write"],
    featureFlag: "webhooks",
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

    return NextResponse.json({
      id: webhookId,
    });
  },
  {
    requiredPermissions: ["webhooks.write"],
    featureFlag: "webhooks",
  },
);
