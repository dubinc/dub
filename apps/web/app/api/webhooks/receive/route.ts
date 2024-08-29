import { prisma } from "@/lib/prisma";
import { webhookPayloadSchema } from "@/lib/webhook/schemas";
import { LeadEventDataProps } from "@/lib/webhook/types";
import crypto from "crypto";

// POST /api/webhooks/receive - receive link-level webhooks from Dub
export const POST = async (req: Request) => {
  const body = await req.json();
  const { event, data } = webhookPayloadSchema.parse(body);

  const webhookSignature = req.headers.get("Dub-Signature");

  if (!webhookSignature) {
    return new Response("No signature", { status: 400 });
  }

  const computedSignature = crypto
    .createHmac("sha256", `${process.env.DUB_WEBHOOK_SECRET}`)
    .update(JSON.stringify(body))
    .digest("hex");

  if (webhookSignature !== computedSignature) {
    return new Response("Invalid signature", { status: 400 });
  }

  // A new lead was created on Dub
  if (event === "lead.created") {
    const lead = data as LeadEventDataProps;
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
