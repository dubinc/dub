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

    const processingPayouts =
      toBeSentPayouts.find((p) => p.status === "processing")?._sum.amount ?? 0; // payouts awaiting payment from program
    const processedPayouts =
      toBeSentPayouts.find((p) => p.status === "processed")?._sum.amount ?? 0; // payouts paid by program, awaiting withdrawal by partner

    const currentAvailableBalance = stripeBalanceData.available[0].amount; // available to withdraw
    const currentPendingBalance = stripeBalanceData.pending[0].amount; // balance waiting to settle

    const balanceToWithdraw = currentAvailableBalance - processedPayouts;

    console.log({
      processingPayouts,
      processedPayouts,
      currentAvailableBalance,
      currentPendingBalance,
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
