import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { updateUsage } from "./utils";

// Cron to update the usage stats of each workspace.
// Runs once every day at noon UTC (0 12 * * *)

export const dynamic = "force-dynamic";

async function handler(req: Request) {
  try {
    if (req.method === "GET") {
      await verifyVercelSignature(req);
    } else if (req.method === "POST") {
      await verifyQstashSignature(req);
    }

    await updateUsage();

    return NextResponse.json({
      response: "success",
    });
  } catch (error) {
    await log({
      message: `Error updating usage: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}

export { handler as GET, handler as POST };
