import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { getPayPalBalance } from "@/lib/paypal/get-paypal-balance";
import { getPendingPaypalPayouts } from "@/lib/paypal/get-pending-payouts";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// This route is used to check PayPal balance and notify us if it needs refilling
// Runs every 3 hours (0 */3 * * *)

export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const [pendingPaypalPayouts, currentPaypalBalance] = await Promise.all([
      getPendingPaypalPayouts(),
      getPayPalBalance(),
    ]);

    const pendingPaypalPayoutsTotal = pendingPaypalPayouts.reduce(
      (acc, payout) => acc + payout.amount,
      0,
    );

    return NextResponse.json({
      pendingPaypalPayoutsTotal,
      currentPaypalBalance,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
