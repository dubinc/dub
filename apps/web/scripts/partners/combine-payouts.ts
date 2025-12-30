import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";

// One time script to combine old payouts for a partner
async function main() {
  const pendingPayouts = await prisma.payout.groupBy({
    by: ["programId", "partnerId"],
    where: {
      status: "pending",
    },
    _count: {
      id: true,
    },
    having: {
      id: {
        _count: {
          gte: 2,
        },
      },
    },
  });

  console.table(pendingPayouts);

  const chunks = chunk(pendingPayouts, 50);
  // Combine payouts
  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async ({ programId, partnerId }) => {
        const payoutsToCombine = await prisma.payout.findMany({
          where: {
            programId,
            partnerId,
            status: "pending",
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        console.log(
          `Combining ${payoutsToCombine.length} payouts for partner ${partnerId}`,
        );

        const periodStart = payoutsToCombine.reduce(
          (earliest, payout) =>
            payout.periodStart && earliest && payout.periodStart < earliest
              ? payout.periodStart
              : earliest,
          payoutsToCombine[0].periodStart || new Date(),
        );

        const periodEnd = payoutsToCombine.reduce(
          (latest, payout) =>
            payout.periodEnd && latest && payout.periodEnd > latest
              ? payout.periodEnd
              : latest,
          payoutsToCombine[0].periodEnd || new Date(),
        );

        const totalAmount = payoutsToCombine.reduce(
          (sum, payout) => sum + payout.amount,
          0,
        );

        // Update the first payout with the combined data
        const combinedPayout = await prisma.payout.update({
          where: {
            id: payoutsToCombine[0].id,
          },
          data: {
            amount: totalAmount,
            periodStart,
            periodEnd,
          },
        });

        // Update all commissions to point to the new combined payout
        const commissions = await prisma.commission.updateMany({
          where: {
            payoutId: {
              in: payoutsToCombine.map((p) => p.id),
            },
          },
          data: {
            payoutId: combinedPayout.id,
          },
        });

        console.log({ commissions });

        // Delete the old payouts
        const deletedPayouts = await prisma.payout.deleteMany({
          where: {
            id: {
              in: payoutsToCombine.slice(1).map((p) => p.id),
            },
          },
        });

        console.log({ deletedPayouts });
      }),
    );
  }
}

main();
