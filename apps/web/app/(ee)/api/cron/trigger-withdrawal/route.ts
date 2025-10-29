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

    const THREE_DAYS_AGO = new Date(
      new Date().setDate(new Date().getDate() - 3),
    );
    const ONE_DAY_AGO = new Date(new Date().setDate(new Date().getDate() - 1));

    const [
      stripeBalanceData,
      processingInvoicesDirectDebit,
      processingInvoicesDirectDebitFast,
      processedPayouts,
    ] = await Promise.all([
      stripe.balance.retrieve(),
      prisma.invoice.aggregate({
        where: {
          status: "processing",
          paymentMethod: {
            in: ["ach", "sepa", "acss"],
          },
          createdAt: {
            // Why we're doing this: Direct debit payments usually take up to 4 business days to settle
            // but in case it settles earlier, we'd want to keep the balance on Stripe for payouts
            // So, we're including "processing" invoices created more than 3 days ago in the reserve balance as well
            lt: THREE_DAYS_AGO,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.invoice.aggregate({
        where: {
          status: "processing",
          paymentMethod: "ach_fast",
          createdAt: {
            // Same reasoning as above, but fast ACH can settle in 2 business days instead of 4
            lt: ONE_DAY_AGO,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.payout.aggregate({
        where: {
          status: "processed",
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const currentAvailableBalance = stripeBalanceData.available[0].amount; // available to withdraw
    const currentPendingBalance = stripeBalanceData.pending[0].amount; // balance waiting to settle

    const processingInvoicesAmount =
      (processingInvoicesDirectDebit._sum.amount ?? 0) +
      (processingInvoicesDirectDebitFast._sum.amount ?? 0);
    const processedPayoutsAmount = processedPayouts._sum.amount ?? 0;

    const amountToKeepOnStripe =
      processingInvoicesAmount + processedPayoutsAmount;

    const balanceToWithdraw = currentAvailableBalance - amountToKeepOnStripe;

    console.log({
      currentAvailableBalance: `${currencyFormatter(currentAvailableBalance / 100)}`,
      currentPendingBalance: `${currencyFormatter(currentPendingBalance / 100)}`,
      processingInvoicesAmount: `${currencyFormatter(processingInvoicesAmount / 100)}`,
      processedPayoutsAmount: `${currencyFormatter(processedPayoutsAmount / 100)}`,
      amountToKeepOnStripe: `${currencyFormatter(amountToKeepOnStripe / 100)}`,
      balanceToWithdraw: `${currencyFormatter(balanceToWithdraw / 100)}`,
    });

    const reservedBalance = 50000; // keep at least $500 in the account
    if (balanceToWithdraw <= reservedBalance) {
      return logAndRespond(
        `Balance to withdraw is less than ${currencyFormatter(reservedBalance / 100)}, skipping...`,
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
