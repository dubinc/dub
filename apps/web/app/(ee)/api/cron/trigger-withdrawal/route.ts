import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import { currencyFormatter } from "@dub/utils";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

/*
    This route is used to trigger withdrawal from Stripe (since we're using manual payouts)
    Runs twice a day at midnight and noon UTC (0 0 * * * and 0 12 * * *)
*/
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const [stripeBalanceData, payoutsToBeSentData] = await Promise.all([
      stripe.balance.retrieve(),
      prisma.payout.aggregate({
        where: {
          status: {
            in: ["processing", "processed"],
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const currentAvailableBalance = stripeBalanceData.available[0].amount; // available to withdraw
    const currentPendingBalance = stripeBalanceData.pending[0].amount; // balance waiting to settle
    // x-slack-ref: https://dub.slack.com/archives/C074P7LMV9C/p1750185638973479
    const currentNetBalance =
      currentPendingBalance < 0
        ? currentAvailableBalance + currentPendingBalance
        : currentAvailableBalance;

    const payoutsToBeSent = payoutsToBeSentData._sum.amount ?? 0;
    const reservedBalance = 30_000_00; // keep at least $30,000 in the account
    const balanceToWithdraw =
      currentNetBalance - payoutsToBeSent - reservedBalance;

    console.log({
      currentAvailableBalance: `${currencyFormatter(currentAvailableBalance / 100)}`,
      currentPendingBalance: `${currencyFormatter(currentPendingBalance / 100)}`,
      currentNetBalance: `${currencyFormatter(currentNetBalance / 100)}`,
      payoutsToBeSent: `${currencyFormatter(payoutsToBeSent / 100)}`,
      balanceToWithdraw: `${currencyFormatter(balanceToWithdraw / 100)}`,
    });

    if (balanceToWithdraw <= 0) {
      return logAndRespond(
        `Balance to withdraw (after deducting payouts to be sent and reserved balance) is less than $0, skipping...`,
      );
    }

    const createdPayout = await stripe.payouts.create({
      amount: balanceToWithdraw,
      currency: "usd",
    });

    return logAndRespond(
      `Created payout: ${createdPayout.id} (${currencyFormatter(createdPayout.amount / 100)})`,
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
