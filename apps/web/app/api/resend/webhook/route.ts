import { withAxiom } from "@/lib/axiom/server";
import { NextResponse } from "next/server";
import { Webhook, WebhookVerificationError } from "svix";
import { emailBounced } from "./email-bounced";
import { emailDelivered } from "./email-delivered";
import { emailOpened } from "./email-opened";

const webhookSecret = process.env.RESEND_WEBHOOK_SECRET!;

// POST /api/resend/webhook – listen to Resend webhooks
export const POST = withAxiom(async (req: Request) => {
  const rawBody = await req.text();

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers." },
      { status: 400 },
    );
  }

  const webhook = new Webhook(webhookSecret);

  let payload: { type?: string; data?: any };

  try {
    // Throws on an invalid signature, returns the parsed payload on success
    payload = webhook.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof payload;
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json(
        { error: "Invalid signature." },
        { status: 401 },
      );
    }

    throw error;
  }

  const { type, data } = payload || {};

  switch (type) {
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
});
