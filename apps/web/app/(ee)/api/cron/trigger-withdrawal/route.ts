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

    const [stripeBalanceData, dubProcessingPayouts] = await Promise.all([
      stripe.balance.retrieve(),
      prisma.payout.aggregate({
        where: {
          status: "processing",
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const currentAvailableBalance = stripeBalanceData.available[0].amount;

    console.log({
      currentAvailableBalance,
      dubProcessingPayouts,
      stripeBalanceData,
    });

    let reservedBalance = 50000; // keep at least $500 in the account

    const totalProcessingPayouts = dubProcessingPayouts._sum.amount;
    if (totalProcessingPayouts) {
      // add the processing payouts to the reserved balance (to make sure we have enough balance
      // to pay out partners when chargeSucceeded webhook is triggered)
      reservedBalance += totalProcessingPayouts;
    }

    const balanceToWithdraw = currentAvailableBalance - reservedBalance;

    if (balanceToWithdraw <= 10000) {
      return NextResponse.json({
        message: "Balance to withdraw is less than $100, skipping...",
      });
    }

    const createdPayout = await stripe.payouts.create({
      amount: balanceToWithdraw,
      currency: "usd",
    });

    return NextResponse.json({
      currentAvailableBalance,
      reservedBalance,
      balanceToWithdraw,
      createdPayout,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
