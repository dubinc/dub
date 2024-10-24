import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { redis } from "@/lib/upstash";
import { randomBadgeColor } from "@/ui/links/tag-badge";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { importLinksFromBitly } from "./utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await verifyQstashSignature(req, body);
    const { workspaceId, bitlyGroup, importTags } = body;

    try {
      const bitlyApiKey = await redis.get(`import:bitly:${workspaceId}`);

      let tagsToId: Record<string, string> | null = null;
      if (importTags === true) {
        const tagsImported = await redis.get(
          `import:bitly:${workspaceId}:tags`,
        );

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
          id: workspaceId,
        },
        select: {
          slug: true,
        },
      });
      throw new DubApiError({
        code: "bad_request",
        message: `Workspace: ${workspace?.slug || workspaceId}$. Error: ${error.message}`,
      });
    }
  } catch (error) {
    await log({
      message: `Error importing Bitly links: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
