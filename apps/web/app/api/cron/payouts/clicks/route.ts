import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { createPayout } from "../create-payout";

export const dynamic = "force-dynamic";

// This route is used to calculate payouts for clicks.
// Runs once every day at 00:00 (0 0 * * *)
// GET /api/cron/payouts/clicks
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const clicks = await prisma.commission.groupBy({
      by: ["programId", "partnerId"],
      where: {
        type: "click",
        status: "pending",
        payoutId: null,
      },
      _sum: {
        quantity: true,
      },
    });

    if (!clicks.length) {
      return NextResponse.json({
        message: "No pending clicks found. Skipping...",
      });
    }

    for (const { programId, partnerId } of clicks) {
      await createPayout({
        programId,
        partnerId,
        type: "click",
      });
    }

    return NextResponse.json({
      message: "Clicks payout created.",
      clicks,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
