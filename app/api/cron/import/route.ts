import { log } from "#/lib/utils";
import { importLinksFromBitly } from "#/lib/cron/import";
import { redis } from "#/lib/upstash";
import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";

export const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    const isValid = await receiver.verify({
      signature: req.headers.get("Upstash-Signature") || "",
      body: "",
    });
    if (!isValid) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  try {
    const data = await req.json();
    const { provider, projectId } = data;
    if (provider === "bitly") {
      const bitlyApiKey = await redis.get(`import:bitly:${projectId}`);
      await importLinksFromBitly({
        ...data,
        bitlyApiKey,
      });
    }
    return NextResponse.json({
      response: "success",
    });
  } catch (error) {
    await log({
      message: "Import cron failed. Error: " + error.message,
      type: "cron",
      mention: true,
    });
    return NextResponse.json({ error: error.message });
  }
}
