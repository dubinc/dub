import { prisma } from "@/lib/prisma";
import { log } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const token = searchParams.get("token") as string;

  if (token !== process.env.FLODESK_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await req.json();

  // parse the payload
  const { subscriber } = payload;

  if (!subscriber.email) {
    return new Response("Invalid payload", { status: 400 });
  }

  await Promise.all([
    prisma.user.update({
      where: {
        email: subscriber.email,
      },
      data: {
        subscribed: false,
      },
    }),
    log({
      message: `*${subscriber.email}* unsubscribed from the newsletter (*Flodesk*).`,
      type: "subscribers",
    }),
  ]);

  return NextResponse.json({ success: true });
}
