import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { createSalesPayout } from "@/lib/partners/create-sales-payout";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/*
    This route is used to calculate payouts for partners.
    Runs once every hour (0 * * * *)
*/

// GET /cron/payouts/sales
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const pendingSales = await prisma.sale.groupBy({
      by: ["programId", "partnerId"],
      where: {
        status: "pending",
      },
      _count: {
        id: true,
      },
    });

    if (!pendingSales.length) {
      return NextResponse.json({
        message: "No pending sales found. Skipping...",
      });
    }

    // TODO: Find a batter way to handle this recursively (e.g. /api/cron/usage)
    for (const { programId, partnerId } of pendingSales) {
      await createSalesPayout({
        programId,
        partnerId,
      });
    }

    return NextResponse.json(pendingSales);
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
