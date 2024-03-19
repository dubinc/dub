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
    const { workspaceId, bitlyGroup, importTags } = body;
    const bitlyApiKey = await redis.get(`import:bitly:${workspaceId}`);

    let tagsToId: Record<string, string> | null = null;
    if (importTags === true) {
      const tagsImported = await redis.get(`import:bitly:${workspaceId}:tags`);

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
            projectId: workspaceId,
          })),
          skipDuplicates: true,
        });
        await redis.set(`import:bitly:${workspaceId}:tags`, "true");
      }

      tagsToId = await prisma.tag
        .findMany({
          where: {
            projectId: workspaceId,
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
    const workspace = await prisma.project.findUnique({
      where: {
        id: body.workspaceId,
      },
      select: {
        slug: true,
      },
    });

    await log({
      message: `Import Bitly cron for workspace ${
        workspace?.slug || body.workspaceId
      } failed. Error: ${error.message}`,
      type: "errors",
    });
    return NextResponse.json({ error: error.message });
  }
}
