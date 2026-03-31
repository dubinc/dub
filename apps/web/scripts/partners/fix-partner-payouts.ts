import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  let batch = 1;
  const BATCH_SIZE = 5000;
  while (true) {
    const payouts = await prisma.payout.findMany({
      where: {
        status: "pending",
      },
      take: BATCH_SIZE,
      skip: (batch - 1) * BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
    });
    if (payouts.length === 0) {
      console.log("No more payouts to process");
      break;
    }

    console.log(`Processing batch #${batch} of 22`);

    const aggregatedPayouts = await prisma.commission.groupBy({
      by: ["payoutId"],
      where: {
        payoutId: {
          in: payouts.map((payout) => payout.id),
        },
      },
      _sum: {
        earnings: true,
      },
    });
    const payoutIdToActualAmount = aggregatedPayouts.reduce(
      (acc, payout) => {
        if (payout.payoutId) {
          acc[payout.payoutId] = payout._sum.earnings ?? 0;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const payoutsToUpdate = payouts
      .filter((payout) => payoutIdToActualAmount[payout.id] !== payout.amount)
      .map((payout) => ({
        id: payout.id,
        amount: payoutIdToActualAmount[payout.id] ?? 0,
      }));

    console.log(`Found ${payoutsToUpdate.length} payouts to update`);
    console.table(payoutsToUpdate.slice(0, 10));

    const chunks = chunk(payoutsToUpdate, 100);
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (payout) => {
          await prisma.payout.update({
            where: { id: payout.id },
            data: { amount: payout.amount },
          });
        }),
      );
    }
    batch++;
  }
}

main();
