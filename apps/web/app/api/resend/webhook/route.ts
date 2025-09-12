import crypto from "crypto";
import { NextResponse } from "next/server";
import { contactUpdated } from "./contact-updated";
import { emailOpened } from "./email-opened";

// POST /api/resend/webhook – listen to Resend webhooks
export const POST = async (req: Request) => {
  const rawBody = await req.text();

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature")?.split("v1,")[1];

  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret || !svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;

  // Need to base64 decode the secret
  const secretBytes = Buffer.from(secret.split("_")[1], "base64");
  const computedSignature = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  if (computedSignature !== svixSignature) {
    return NextResponse.json(
      { message: "Invalid signature." },
      { status: 400 },
    );
  }

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
