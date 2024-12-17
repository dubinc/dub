import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/*
    This route is used to trigger withdrawal from Stripe (since we're using manual payouts)
    Runs twice a day at midnight and noon UTC (0 0 * * * and 0 12 * * *)
*/
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const [currentBalance, pendingPayouts] = await Promise.all([
      stripe.balance.retrieve(),
      prisma.payout.findMany({
        where: {
          status: "processing",
        },
      }),
    ]);

    let reservedBalance = 50000; // keep at least $500 in the account

    if (pendingPayouts.length) {
      const totalPendingPayouts = pendingPayouts.reduce(
        (acc, payout) => acc + payout.amount,
        0,
      );

      // add the pending payouts to the reserved balance (to make sure we have enough balance
      // to pay out partners when chargeSucceeded webhook is triggered)
      reservedBalance += totalPendingPayouts;
    }

    if (reservedBalance > currentBalance.available[0].amount) {
      return NextResponse.json({
        message: "Insufficient balance to trigger withdrawal, skipping...",
      });
    }

    const balanceToWithdraw =
      currentBalance.available[0].amount - reservedBalance;

    const createPayout = await stripe.payouts.create({
      amount: balanceToWithdraw,
      currency: "usd",
    });

    return NextResponse.json({
      currentBalance,
      reservedBalance,
      balanceToWithdraw,
      createPayout,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
