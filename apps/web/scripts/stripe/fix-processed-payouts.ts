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
    `Total amount: ${currencyFormatter(partnersWithProcessedPayouts.reduce((acc, partner) => acc + (partner._sum.amount ?? 0), 0) / 100)}`,
  );
  console.table(partnersWithProcessedPayouts.slice(0, 10));

  const processedPayouts = await prisma.payout.findMany({
    where: {
      status: "processed",
      stripeTransferId: null,
      partnerId: {
        in: partnersWithProcessedPayouts.map((partner) => partner.partnerId),
      },
    },
    include: {
      partner: {
        select: {
          id: true,
          email: true,
          stripeConnectId: true,
        },
      },
      program: {
        select: {
          name: true,
        },
      },
    },
  });

  for (const partner of partnersWithProcessedPayouts) {
    const previouslyProcessedPayouts = processedPayouts.filter(
      (p) => p.partner.id === partner.partnerId,
    );
    if (previouslyProcessedPayouts.length === 0) {
      // shouldn't happen but just in case
      console.log(
        `No previously processed payouts found for partner ${partner.partnerId}, skipping...`,
      );
      continue;
    }
    console.log(
      `Creating stripe transfer for partner ${previouslyProcessedPayouts[0].partner.email} with ${previouslyProcessedPayouts.length} payouts (total amount: ${currencyFormatter(previouslyProcessedPayouts.reduce((acc, p) => acc + p.amount, 0) / 100)})`,
    );
    await createStripeTransfer({
      partner: previouslyProcessedPayouts[0].partner,
      previouslyProcessedPayouts,
    });
  }
}

main();
