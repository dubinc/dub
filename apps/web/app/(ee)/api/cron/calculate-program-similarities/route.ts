import {
  calculatePartnerProgramPerformances,
  calculateProgramSimilarities,
} from "@/lib/api/network/program-similarity-calculator";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await verifyVercelSignature(req);

    console.log(
      "Starting program similarity and performance calculation cron job",
    );

    // Calculate program similarities (this is computationally expensive, so run less frequently)
    await calculateProgramSimilarities();

    // Calculate partner program performances (lighter computation, can run more frequently)
    await calculatePartnerProgramPerformances();

    console.log(
      "Program similarity and performance calculation completed successfully",
    );

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
