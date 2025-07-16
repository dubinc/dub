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

    const [stripeBalanceData, toBeSentPayouts] = await Promise.all([
      stripe.balance.retrieve(),
      prisma.payout.aggregate({
        where: {
          status: {
            in: ["processing", "processed"],
          },
          stripeTransferId: null,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const currentAvailableBalance = stripeBalanceData.available[0].amount;
    const currentPendingBalance = stripeBalanceData.pending[0].amount;

    // if the pending balance is negative, add it to the available balance
    // this only happens when we have a connected account transfer that hasn't fully settled yet
    // x-slack-ref: https://dub.slack.com/archives/C074P7LMV9C/p1750185638973479
    const currentNetBalance =
      currentPendingBalance < 0
        ? currentAvailableBalance + currentPendingBalance
        : currentAvailableBalance;

    console.log({
      currentAvailableBalance,
      currentPendingBalance,
      currentNetBalance,
      toBeSentPayouts,
      stripeBalanceData,
    });

    let reservedBalance = 50000; // keep at least $500 in the account

    const totalToBeSentPayouts = toBeSentPayouts._sum.amount;
    if (totalToBeSentPayouts) {
      // add the total payouts that are still to be sent to connected accounts
      // to the reserved balance (to make sure we have enough balance
      // to pay out partners when chargeSucceeded webhook is triggered)
      reservedBalance += totalToBeSentPayouts;
    }

    const balanceToWithdraw = currentNetBalance - reservedBalance;

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
      currentPendingBalance,
      currentNetBalance,
      reservedBalance,
      balanceToWithdraw,
      createdPayout,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
