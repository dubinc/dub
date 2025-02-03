import { prisma } from "@dub/prisma";
import crypto from "crypto";
import { NextResponse } from "next/server";

export const POST = async (req: Request) => {
  const rawBody = await req.text();

  const svix_id = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature")?.split("v1,")[1];

  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret || !svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const signedContent = `${svix_id}.${svix_timestamp}.${rawBody}`;

  // Need to base64 decode the secret
  const secretBytes = Buffer.from(secret.split("_")[1], "base64");
  const signature = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  if (signature !== svix_signature) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
  }

  const {
    data: { email, unsubscribed },
  } = JSON.parse(rawBody) || {};

  console.log(
    `${email} ${unsubscribed ? "unsubscribed from" : "subscribed to"} mailing list. Updating user...`,
  );

  if (email) {
    await prisma.user.update({
      where: {
        email,
      },
      data: {
        subscribed: !unsubscribed,
      },
    });
  }

  return NextResponse.json({ message: "Webhook received" });
};
