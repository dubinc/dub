import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { calculatePartnerProgramPerformances } from "@/lib/api/network/calculate-partner-program-performances";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { NextRequest } from "next/server";
import { logAndRespond } from "../utils";

// GET /api/cron/calculate-partner-program-performances
// Calculate partner program performances (lighter computation, can run more frequently)
export async function GET(req: NextRequest) {
  try {
    await verifyVercelSignature(req);

    await calculatePartnerProgramPerformances();

    return logAndRespond("Partner program performances calculation completed.");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
