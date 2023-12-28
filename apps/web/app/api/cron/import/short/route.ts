import { receiver } from "@/lib/cron";
import { redis } from "@/lib/upstash";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { importLinksFromShort } from "./utils";

export async function POST(req: Request) {
  const body = await req.json();
  if (process.env.VERCEL === "1") {
    const isValid = await receiver.verify({
      signature: req.headers.get("Upstash-Signature") || "",
      body: JSON.stringify(body),
    });
    if (!isValid) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  try {
    const { projectId, userId, domainId, domain, pageToken, count } = body;
    const shortApiKey = (await redis.get(
      `import:short:${projectId}`,
    )) as string;
    await importLinksFromShort({
      projectId,
      userId,
      domainId,
      domain,
      pageToken,
      count,
      shortApiKey,
    });
    return NextResponse.json({
      response: "success",
    });
  } catch (error) {
    await log({
      message: "Import Short.io cron failed. Error: " + error.message,
      type: "cron",
      mention: true,
    });
    return NextResponse.json({ error: error.message });
  }
}
