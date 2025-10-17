import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { contactUpdated } from "./contact-updated";
import { emailBounced } from "./email-bounced";
import { emailDelivered } from "./email-delivered";
import { emailOpened } from "./email-opened";

const webhookSecret = process.env.RESEND_WEBHOOK_SECRET!;

// POST /api/resend/webhook – listen to Resend webhooks
export const POST = async (req: Request) => {
  const rawBody = await req.text();
  const webhook = new Webhook(webhookSecret);

  // Throws on error, returns the verified content on success
  webhook.verify(rawBody, {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  });

  const { type, data } = JSON.parse(rawBody) || {};

  switch (type) {
    case "contact.updated":
      await contactUpdated(data);
      break;
    case "email.opened":
      await emailOpened(data);
      break;
    case "email.delivered":
      await emailDelivered(data);
      break;
    case "email.bounced":
      await emailBounced(data);
      break;
  }

  return NextResponse.json({ message: "Webhook processed." });
};
