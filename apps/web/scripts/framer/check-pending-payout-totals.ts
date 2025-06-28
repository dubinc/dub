import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const payouts = await prisma.payout.findMany({
    where: {
      programId: "prog_xxx",
      status: "pending",
    },
  });

  const commissions = await prisma.commission.groupBy({
    by: ["payoutId"],
    where: {
      payoutId: { in: payouts.map((payout) => payout.id) },
    },
    _sum: {
      earnings: true,
    },
  });

  // go through each to make sure total === amount, and log each
  for (const payout of payouts) {
    const total =
      commissions.find((commission) => commission.payoutId === payout.id)?._sum
        .earnings ?? 0;

    if (total !== payout.amount) {
      console.log(
        `ALERT: Payout ${payout.id} has a total of ${total} but an amount of ${payout.amount}`,
      );
    } else {
      console.log(
        `Payout ${payout.id} matches ${total}, ${payout.amount}. skipping...`,
      );
    }
  }
}

main();
