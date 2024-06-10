import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@/lib/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { importLinksFromCSV } from "./utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await verifyQstashSignature(req, body);
    const { workspaceId, userId, domain, count } = body;

    try {
      await importLinksFromCSV({
        workspaceId,
        userId,
        domain,
        count,
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
        message: `Workspace: ${workspace?.slug || workspaceId}. Error: ${error.message}`,
      });
    }
  } catch (error) {
    await log({
      message: `Error importing CSV links: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
