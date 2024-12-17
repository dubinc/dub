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
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const partners = await prisma.programEnrollment.findMany({
      where: {
        status: "approved",
      },
    });

    if (!partners.length) {
      return;
    }

    // TODO:
    // We need a batter way to handle this recursively
    for (const { programId, partnerId } of partners) {
      await createSalesPayout({
        programId,
        partnerId,
      });
    }

    return NextResponse.json({
      message: `Calculated payouts for ${partners.length} partners`,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
