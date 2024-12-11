import { withWorkspace } from "@/lib/auth";
import { getWebhookEvents } from "@/lib/tinybird/get-webhook-events";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/webhooks/[webhookId]/events - get logs for a webhook
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

    const parsedEvents = events.data.map((event) => ({
      ...event,
      request_body: JSON.parse(event.request_body),
    }));

    return NextResponse.json(parsedEvents);
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
