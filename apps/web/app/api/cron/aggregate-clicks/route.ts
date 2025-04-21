import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { updateAggregateClicks } from "./utils";

export const dynamic = "force-dynamic";

/*
    This route aggregates click events in daily batches for Program links and add to the Commission table.
    Runs every day at 00:00 (0 0 * * *)
    GET /api/cron/aggregate-clicks   -- initial trigger (Vercel)
    POST /api/cron/aggregate-clicks  -- batch continuation (QStash)
*/
async function handler(req: Request) {
  try {
    if (req.method === "GET") {
      await verifyVercelSignature(req);
      await updateAggregateClicks();
    } else if (req.method === "POST") {
      await verifyQstashSignature({
        req,
        rawBody: await req.text(),
      });

      const { cursor } = JSON.parse(await req.text()) as { cursor?: string };
      await updateAggregateClicks({ cursor });
    }

    return NextResponse.json({
      response: "success",
    });
  } catch (error) {
    await log({
      message: `Error updating aggregate clicks: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}

export { handler as GET, handler as POST };
