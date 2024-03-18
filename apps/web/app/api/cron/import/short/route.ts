import { receiver } from "@/lib/cron";
import prisma from "@/lib/prisma";
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
    const {
      workspaceId,
      userId,
      domainId,
      domain,
      importTags,
      pageToken,
      count,
    } = body;
    const shortApiKey = (await redis.get(
      `import:short:${workspaceId}`,
    )) as string;
    await importLinksFromShort({
      workspaceId,
      userId,
      domainId,
      domain,
      importTags,
      pageToken,
      count,
      shortApiKey,
    });
    return NextResponse.json({
      response: "success",
    });
  } catch (error) {
    const workspace = await prisma.project.findUnique({
      where: {
        id: body.workspaceId,
      },
      select: {
        slug: true,
      },
    });

    await log({
      message: `Import Short.io cron for workspace ${
        workspace?.slug || body.workspaceId
      } failed. Error: ${error.message}`,
      type: "errors",
    });
    return NextResponse.json({ error: error.message });
  }
}
