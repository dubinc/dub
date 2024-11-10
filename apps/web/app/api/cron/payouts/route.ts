import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { processMonthlyPartnerPayouts } from "@/lib/api/sales/payout";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    await processMonthlyPartnerPayouts();

    return NextResponse.json({ message: "Payouts calculated" });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
