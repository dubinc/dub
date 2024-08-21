import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWebhookEvents } from "@/lib/tinybird/get-webhook-events";
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

    // TODO:
    // 1. Filter events by url, workspace, event type, http status
    // 2. Paginate events
    // 3. Sort events by createdAt

    const events = await getWebhookEvents({
      webhookId,
    });

    // console.log(events);

    return NextResponse.json(events.data);
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
