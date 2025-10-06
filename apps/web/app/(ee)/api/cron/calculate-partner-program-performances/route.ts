import { calculatePartnerProgramPerformances } from "@/lib/api/network/program-similarity-calculator";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { NextRequest, NextResponse } from "next/server";

// GET /api/cron/calculate-partner-program-performances
// Calculate partner program performances (lighter computation, can run more frequently)
export async function GET(req: NextRequest) {
  try {
    await verifyVercelSignature(req);

    await calculatePartnerProgramPerformances();

    return NextResponse.json({
      success: true,
      message: "Program similarity and performance calculation completed",
    });
  } catch (error) {
    console.error("Error in program similarity calculation cron:", error);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
