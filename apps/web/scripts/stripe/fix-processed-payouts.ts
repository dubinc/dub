import { MIN_WITHDRAWAL_AMOUNT_CENTS } from "@/lib/constants/payouts";
import { prisma } from "@dub/prisma";
import { currencyFormatter } from "@dub/utils";
import "dotenv-flow/config";
import { createStripeTransfer } from "../../lib/partners/create-stripe-transfer";

async function main() {
  const partnersWithProcessedPayouts = await prisma.payout
    .groupBy({
      by: ["partnerId"],
      where: {
        status: "processed",
        stripeTransferId: null,
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: "desc",
        },
      },
      // filter out sum amount below 1000
    })
    .then((result) => {
      return result.filter(
        (partner) =>
          partner._sum.amount &&
          partner._sum.amount >= MIN_WITHDRAWAL_AMOUNT_CENTS,
      );
    });

  console.log(
    `Found ${partnersWithProcessedPayouts.length} partners with processed payouts`,
  );
  console.log(
    `Total amount: ${currencyFormatter(partnersWithProcessedPayouts.reduce((acc, partner) => acc + (partner._sum.amount ?? 0), 0))}`,
  );
  for (const partner of partnersWithProcessedPayouts) {
    await createStripeTransfer({
      partnerId: partner.partnerId,
      forceWithdrawal: true,
    });
  }

  console.log("Done");
}

main();
