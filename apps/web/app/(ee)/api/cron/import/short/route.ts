import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { importLinksFromShort } from "./utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const body = JSON.parse(rawBody);
    const {
      workspaceId,
      userId,
      domainId,
      domain,
      folderId,
      importTags,
      pageToken,
      count,
    } = body;

    try {
      const shortApiKey = (await redis.get(
        `import:short:${workspaceId}`,
      )) as string;
      await importLinksFromShort({
        workspaceId,
        userId,
        domainId,
        domain,
        folderId,
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
      message: `Error importing Short.io links: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
