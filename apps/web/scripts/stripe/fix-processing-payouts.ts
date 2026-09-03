import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const payoutsStuckInProcessing = await prisma.payout.findMany({
    where: {
      method: "stablecoin",
      status: "processing",
      stripeTransferId: null,
      invoice: {
        status: "completed",
        // paid over 7 days ago
        paidAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    },
    include: {
      partner: true,
      invoice: true,
    },
  });

  console.log(
    `Found ${payoutsStuckInProcessing.length} payouts stuck in processing`,
  );

  console.table(
    payoutsStuckInProcessing.map(({ partner, invoice, ...payout }) => ({
      partnerId: partner.id,
      partnerEmail: partner.email,
      payoutId: payout.id,
      payoutAmount: payout.amount,
      paidAt: invoice?.paidAt,
      stripeChargeId: invoice?.stripeChargeMetadata?.["id"],
    })),
  );

  // await markPayoutsAsProcessed(payoutsStuckInProcessing);
}

main();
