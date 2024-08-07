import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createWebhookSchema } from "@/lib/zod/schemas/webhooks";
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
    featureFlag: "integrations",
  },
);

// POST /api/webhooks/ - create a new webhook
export const POST = withWorkspace(
  async ({ req, workspace }) => {
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

    return NextResponse.json(webhook, { status: 201 });
  },
  {
    requiredPermissions: ["webhooks.write"],
    featureFlag: "integrations",
  },
);
