import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { contactUpdated } from "./contact-updated";
import { emailOpened } from "./email-opened";

// POST /api/resend/webhook – listen to Resend webhooks
export const POST = async (req: Request) => {
  const rawBody = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET!;

  const wh = new Webhook(secret);
  // Throws on error, returns the verified content on success
  wh.verify(rawBody, {
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
  }

  return NextResponse.json({ message: "Webhook processed." });
};
