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

    const commissions = await prisma.commission.groupBy({
      by: ["programId", "partnerId"],
      where: {
        type: "sale",
        status: "pending",
        payoutId: null,
      },
    });

    if (!commissions.length) {
      return NextResponse.json({
        message: "No pending sale commissions found. Skipping...",
      });
    }

    // TODO: Find a batter way to handle this recursively (e.g. /api/cron/usage)
    for (const { programId, partnerId } of commissions) {
      await createPayout({
        programId,
        partnerId,
        type: "sale",
      });
    }

    return NextResponse.json({
      message: "Sale commissions payout created.",
      commissions,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
