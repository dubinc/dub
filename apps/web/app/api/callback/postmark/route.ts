import { unsubscribe } from "@/lib/flodesk";
import { prisma } from "@/lib/prisma";
import { log } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // authenticate webhook X-Postmark-Webhook-Secret
  const token = req.headers.get("X-Postmark-Webhook-Secret");
  if (token !== process.env.POSTMARK_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await req.json();

  // parse the payload
  const { Recipient: email, SuppressSending: unsub } = payload;

  await Promise.all([
    prisma.user.update({
      where: {
        email,
      },
      data: {
        subscribed: !unsub,
      },
    }),
    unsub && unsubscribe(email),
    log({
      message: `*${email}* ${
        unsub ? "unsubscribed" : "subscribed"
      } to the newsletter (*Postmark*). ${!unsub ? "Manual addition required." : ""}`,
      type: "subscribers",
      mention: !unsub,
    }),
  ]);

  return NextResponse.json({ success: true });
}
