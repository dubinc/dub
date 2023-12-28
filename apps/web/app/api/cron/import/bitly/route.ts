import { receiver } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { randomBadgeColor } from "@/ui/links/tag-badge";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { importLinksFromBitly } from "./utils";

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
    const { projectId, bitlyGroup, importTags } = body;
    const bitlyApiKey = await redis.get(`import:bitly:${projectId}`);

    let tagsToId: Record<string, string> | null = null;
    if (importTags === true) {
      const tagsImported = await redis.get(`import:bitly:${projectId}:tags`);

      if (!tagsImported) {
        const tags = (await fetch(
          `https://api-ssl.bitly.com/v4/groups/${bitlyGroup}/tags`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${bitlyApiKey}`,
            },
          },
        )
          .then((r) => r.json())
          .then((r) => r.tags)) as string[];

        await prisma.tag.createMany({
          data: tags.map((tag) => ({
            name: tag,
            color: randomBadgeColor(),
            projectId,
          })),
          skipDuplicates: true,
        });
        await redis.set(`import:bitly:${projectId}:tags`, "true");
      }

      tagsToId = await prisma.tag
        .findMany({
          where: {
            projectId,
          },
          select: {
            id: true,
            name: true,
          },
        })
        .then((tags) =>
          tags.reduce((acc, tag) => {
            acc[tag.name] = tag.id;
            return acc;
          }, {}),
        );
    }
    await importLinksFromBitly({
      ...body,
      tagsToId,
      bitlyApiKey,
    });
    return NextResponse.json({
      response: "success",
    });
  } catch (error) {
    await log({
      message: "Import Bitly cron failed. Error: " + error.message,
      type: "cron",
      mention: true,
    });
    return NextResponse.json({ error: error.message });
  }
}
