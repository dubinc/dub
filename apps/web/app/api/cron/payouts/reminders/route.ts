import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// This route is used to send reminders to partners who have pending payouts
// but haven't configured payouts yet.
// Runs once every 3 days
// GET /api/cron/payouts/reminders
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const payouts = await prisma.payout.groupBy({
      by: ["partnerId"],
      where: {
        status: "pending",
        partner: {
          payoutsEnabledAt: null,
        },
      },
      _sum: {
        amount: true,
      },
    });

    console.log({ payouts });

    return NextResponse.json({
      message:
        "Reminders sent to partners who have pending payouts but haven't configured payouts yet.",
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
