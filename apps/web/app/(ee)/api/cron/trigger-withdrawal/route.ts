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

    const [stripeBalanceData, processingInvoices, processedPayouts] =
      await Promise.all([
        stripe.balance.retrieve(),
        prisma.invoice.aggregate({
          where: {
            status: "processing",
            createdAt: {
              // Why we're doing this: ACH payments usually take up to 4 business days to settle
              // but in case it settles earlier, we'd want to keep the balance on Stripe for payouts
              // So, we're including "processing" invoices created more than 3 days ago in the reserve balance as well
              lt: new Date(new Date().setDate(new Date().getDate() - 3)),
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

    const processingInvoicesAmount = processingInvoices._sum.amount ?? 0;
    const processedPayoutsAmount = processedPayouts._sum.amount ?? 0;

    const amountToKeepOnStripe =
      processingInvoicesAmount + processedPayoutsAmount;

    const balanceToWithdraw = currentAvailableBalance - amountToKeepOnStripe;

    console.log({
      currentAvailableBalance,
      currentPendingBalance,
      processingInvoicesAmount,
      processedPayoutsAmount,
      amountToKeepOnStripe,
      balanceToWithdraw,
    });

    const reservedBalance = 50000; // keep at least $500 in the account
    if (balanceToWithdraw <= reservedBalance) {
      return logAndRespond(
        `Balance to withdraw is less than ${currencyFormatter(reservedBalance / 100, { currency: "usd" })}, skipping...`,
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
