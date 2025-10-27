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

    const [stripeBalanceData, toBeSentPayouts] = await Promise.all([
      stripe.balance.retrieve(),
      prisma.payout.groupBy({
        by: ["status"],
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

    const processingPayouts = toBeSentPayouts.find(
      (p) => p.status === "processing",
    )?._sum.amount;
    const processedPayouts =
      toBeSentPayouts.find((p) => p.status === "processed")?._sum.amount ?? 0;

    const currentAvailableBalance = stripeBalanceData.available[0].amount; // available to withdraw
    const currentPendingBalance = stripeBalanceData.pending[0].amount; // balance waiting to settle

    let reservedBalance = 50000; // keep at least $500 in the account
    reservedBalance = reservedBalance + processedPayouts; // add already processed payouts to the reserved balance

    const balanceToWithdraw = currentAvailableBalance - reservedBalance;

    console.log({
      processingPayouts,
      processedPayouts,
      currentAvailableBalance,
      currentPendingBalance,
      reservedBalance,
      balanceToWithdraw,
    });

    if (balanceToWithdraw <= 10000) {
      return logAndRespond(
        "Balance to withdraw is less than $100, skipping...",
      );
    }

    const createdPayout = await stripe.payouts.create({
      amount: balanceToWithdraw,
      currency: "usd",
    });

    return logAndRespond(
      `Created payout: ${createdPayout.id} (${currencyFormatter(createdPayout.amount / 100, { currency: createdPayout.currency })})`,
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
