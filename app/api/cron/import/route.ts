import { log } from "#/lib/utils";
import { importLinksFromBitly } from "./utils";
import { redis } from "#/lib/upstash";
import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import prisma from "#/lib/prisma";
import { randomBadgeColor } from "@/components/app/links/tag-badge";

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

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
    const { provider, projectId, bitlyGroup, keepTags } = body;
    if (provider === "bitly") {
      const bitlyApiKey = await redis.get(`import:bitly:${projectId}`);
      let tagsToId;
      if (keepTags === true) {
        const tags = await fetch(
          `https://api-ssl.bitly.com/v4/groups/${bitlyGroup}/tags`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${bitlyApiKey}`,
            },
          },
        )
          .then((r) => r.json())
          .then((r) => r.tags);

        await prisma.tag.createMany({
          data: tags.map((tag) => ({
            name: tag,
            color: randomBadgeColor(),
            projectId,
          })),
          skipDuplicates: true,
        });
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
