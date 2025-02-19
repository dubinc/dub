import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { conn } from "@/lib/planetscale";
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
      data: z.object({
        workspaceId: z.string(),
        clicks: z.number(),
      }),
    });

    const response = await pipe({});
    const data = response.data;

    // Process in batches of 100, since this can be >1000 rows to update
    const BATCH_SIZE = 100;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (data) => {
          await conn.execute(
            `UPDATE Project SET usage = usage + ? WHERE id = ?`,
            [data.clicks, data.workspaceId],
          );
        }),
      );
      // Add a 1 second delay between batches
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

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
