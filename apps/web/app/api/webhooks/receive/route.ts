// TODO:
// Move this to proper route path
// Verify the Dub-Signature header

import { prisma } from "@/lib/prisma";
import { LeadEventData } from "@/lib/webhook/types";
import { webhookPayloadSchema } from "@/lib/zod/schemas/webhooks";

// POST /api/webhooks/receive - receive link-level webhooks from Dub
export const POST = async (req: Request) => {
  const body = await req.json();
  const { event, data } = webhookPayloadSchema.parse(body);

  // A new lead was created on Dub
  if (event === "lead.created") {
    const lead = data as LeadEventData;
    const workspaceId = lead.link.externalId?.replace("ws_", "");

    if (!workspaceId) {
      console.error("Workspace ID not found", { lead });
      return new Response("OK");
    }

    // Update the referrer's workspace
    await prisma.project.update({
      where: {
        id: workspaceId,
      },
      data: {
        referredSignups: {
          increment: 1,
        },
        usageLimit: {
          increment: 500,
        },
      },
    });
  }

  return new Response("OK");
};
