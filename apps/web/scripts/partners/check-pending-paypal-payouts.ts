import { prisma } from "@dub/prisma";
import {
  COUNTRIES,
  PAYPAL_SUPPORTED_COUNTRIES,
  currencyFormatter,
} from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  console.log("Checking pending PayPal payouts...");
  console.log(
    "PayPal supported countries:",
    PAYPAL_SUPPORTED_COUNTRIES,
    PAYPAL_SUPPORTED_COUNTRIES.map((country) => COUNTRIES[country]),
  );

  const payouts = await prisma.payout.findMany({
    where: {
      status: {
        in: ["pending", "processing"],
      },
      amount: {
        gte: 10000,
      },
      partner: {
        // payoutsEnabledAt: {
        //   not: null,
        // },
        country: {
          in: PAYPAL_SUPPORTED_COUNTRIES,
        },
      },
    },
    include: {
      partner: true,
      program: true,
    },
  });

  const eligiblePayouts = payouts
    .filter((payout) => payout.amount >= payout.program.minPayoutAmount)
    .map((payout) => ({
      program: payout.program.name,
      partner: payout.partner.email,
      status: payout.status,
      country: payout.partner.country,
      amount: payout.amount / 100,
    }));

  console.table(eligiblePayouts);
  console.log(`Total eligible payouts: ${eligiblePayouts.length}`);
  console.log(
    `Total eligble payout amount: ${currencyFormatter(eligiblePayouts.reduce((acc, payout) => acc + payout.amount, 0))}`,
  );
}

main();
