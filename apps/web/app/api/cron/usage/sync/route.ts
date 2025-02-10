import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { tb } from "@/lib/tinybird";
import z from "@/lib/zod";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";

/*
    This route is used to sync the usage stats of each workspace.
    Runs once every hour (0 * * * *)
*/
export const dynamic = "force-dynamic";

async function handler(req: Request) {
  try {
    if (req.method === "GET") {
      await verifyVercelSignature(req);
    } else if (req.method === "POST") {
      await verifyQstashSignature({
        req,
        rawBody: await req.text(),
      });
    }

    const pipe = tb.buildPipe({
      pipe: "v2_usage_sync",
      parameters: z.any(),
      data: z.object({
        workspaceId: z.string(),
        clicks: z.number(),
      }),
    });

    const response = await pipe({});

    return NextResponse.json(response.data);
  } catch (error) {
    await log({
      message: `Error updating usage: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}

export { handler as GET, handler as POST };
