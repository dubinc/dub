import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { calculateProgramSimilarities } from "@/lib/api/network/program-similarity-calculator";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { NextRequest } from "next/server";
import { logAndRespond } from "../utils";

// GET /api/cron/calculate-program-similarities
// Calculate program similarities (this is computationally expensive, so run less frequently)
export async function GET(req: NextRequest) {
  try {
    await verifyVercelSignature(req);

    await calculateProgramSimilarities();

    return logAndRespond(
      "Program similarity and performance calculation completed successfully.",
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
