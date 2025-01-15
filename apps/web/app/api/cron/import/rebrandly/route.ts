import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { importLinksFromRebrandly, importTagsFromRebrandly } from "./utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const body = JSON.parse(rawBody);
    const { workspaceId, importTags } = body;

    try {
      const rebrandlyApiKey = await redis.get<string>(
        `import:rebrandly:${workspaceId}`,
      );

      if (!rebrandlyApiKey) {
        throw new DubApiError({
          code: "bad_request",
          message: "Rebrandly API key not found",
        });
      }

      let tagsToId: Record<string, string> | null = null;
      if (importTags === true) {
        const tagsImported = await redis.get(
          `import:rebrandly:${workspaceId}:tags`,
        );

        if (!tagsImported) {
          await importTagsFromRebrandly({
            workspaceId,
            rebrandlyApiKey,
          });

          await redis.set(`import:rebrandly:${workspaceId}:tags`, "true");
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
      await importLinksFromRebrandly({
        ...body,
        tagsToId,
        rebrandlyApiKey,
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
      message: `Error importing Rebrandly links: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
