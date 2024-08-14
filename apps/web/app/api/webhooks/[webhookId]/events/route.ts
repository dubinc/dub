import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWebhookEvents } from "@/lib/tinybird/get-webhook-events";
import { NextResponse } from "next/server";

// GET /api/webhooks/[webhookId]/events - get events occurred for a webhook
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { webhookId } = params;

    await prisma.webhook.findUniqueOrThrow({
      where: {
        id: webhookId,
        projectId: workspace.id,
      },
    });

    const events = await getWebhookEvents({
      webhookId,
    });

    console.log(events);

    return NextResponse.json(events);
  },
  {
    requiredPermissions: ["webhooks.read"],
    featureFlag: "webhooks",
  },
);
