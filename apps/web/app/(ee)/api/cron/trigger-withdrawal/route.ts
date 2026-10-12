import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { currencyFormatter } from "@dub/utils";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

// This route is used to trigger withdrawal from Stripe (since we're using manual payouts)
// Runs twice a day at 1AM and 1PM UTC (0 1,13 * * *)
// GET /api/cron/trigger-withdrawal
export const GET = withCron(async () => {
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

  // available to withdraw (USD)
  const currentAvailableBalance =
    stripeBalanceData.available.find((b) => b.currency === "usd")?.amount ?? 0;
  // balance waiting to settle (USD)
  const currentPendingBalance =
    stripeBalanceData.pending.find((b) => b.currency === "usd")?.amount ?? 0;

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
    currentAvailableBalance: `${currencyFormatter(currentAvailableBalance)}`,
    currentPendingBalance: `${currencyFormatter(currentPendingBalance)}`,
    currentNetBalance: `${currencyFormatter(currentNetBalance)}`,
    payoutsToBeSent: `${currencyFormatter(payoutsToBeSent)}`,
    balanceToWithdraw: `${currencyFormatter(balanceToWithdraw)}`,
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
    `Created payout: ${createdPayout.id} (${currencyFormatter(createdPayout.amount)})`,
  );
});
