import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { createPayout } from "../create-payout";

export const dynamic = "force-dynamic";

// This route is used to calculate payouts for sales.
// Runs once every hour (0 * * * *)
// GET /api/cron/payouts/sales
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const sales = await prisma.earnings.groupBy({
      by: ["programId", "partnerId"],
      where: {
        type: "sale",
        status: "pending",
        payoutId: null,
      },
      _sum: {
        quantity: true,
      },
    });

    if (!sales.length) {
      return NextResponse.json({
        message: "No pending sales found. Skipping...",
      });
    }

    // TODO: Find a batter way to handle this recursively (e.g. /api/cron/usage)
    for (const { programId, partnerId } of sales) {
      await createPayout({
        programId,
        partnerId,
        type: "sale",
      });
    }

    return NextResponse.json({
      message: "Sales payout created.",
      sales,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
