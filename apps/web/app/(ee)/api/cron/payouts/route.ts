import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { createPayout } from "./create-payout";

export const dynamic = "force-dynamic";

// This route is used to aggregate pending commissions
// that are past the program holding period into a single payout.
// Runs once every hour (0 * * * *)
// GET /api/cron/payouts
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const commissions = await prisma.commission.groupBy({
      by: ["programId", "partnerId"],
      where: {
        earnings: {
          not: 0,
        },
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
