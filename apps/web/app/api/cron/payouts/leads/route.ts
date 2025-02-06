import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { createPayout } from "../create-payout";

export const dynamic = "force-dynamic";

// This route is used to calculate payouts for leads.
// Runs once every day at 00:00 (0 0 * * *)
// GET /api/cron/payouts/leads
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const leads = await prisma.commission.groupBy({
      by: ["programId", "partnerId"],
      where: {
        type: "lead",
        status: "pending",
        payoutId: null,
      },
      _sum: {
        quantity: true,
      },
    });

    if (!leads.length) {
      return NextResponse.json({
        message: "No pending leads found. Skipping...",
      });
    }

    for (const { programId, partnerId } of leads) {
      await createPayout({
        programId,
        partnerId,
        type: "lead",
      });
    }

    return NextResponse.json({
      message: "Leads payout created.",
      leads,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
