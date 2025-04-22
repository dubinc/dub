import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { NextResponse } from "next/server";
import { PendingCommissionsCursor, processPendingCommissions } from "./utils";

export const dynamic = "force-dynamic";

/*
  This route is used to calculate payouts for the commissions.
  Runs once every hour (0 * * * *)
  GET /api/cron/payouts
*/
async function handler(req: Request) {
  try {
    if (req.method === "GET") {
      await verifyVercelSignature(req);
    } else if (req.method === "POST") {
      await verifyQstashSignature({ req, rawBody: await req.text() });
    }
    const parsed: { cursor?: PendingCommissionsCursor } = await req.json();
    const result = await processPendingCommissions(parsed.cursor);
    return NextResponse.json(result);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}

export { handler as GET, handler as POST };
