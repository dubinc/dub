import { prisma } from "@dub/prisma";
import { CONNECT_SUPPORTED_COUNTRIES, currencyFormatter } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const payouts = await prisma.payout.findMany({
    where: {
      status: {
        in: ["pending", "processing"],
      },
      amount: {
        gte: 10000,
      },
      partner: {
        country: {
          notIn: CONNECT_SUPPORTED_COUNTRIES,
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
