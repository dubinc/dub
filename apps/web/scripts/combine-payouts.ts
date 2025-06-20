import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// A script to combine payouts for a partner
async function main() {
  const programId = "prog_";

  const pendingPayouts = await prisma.payout.groupBy({
    by: ["programId", "partnerId"],
    where: {
      programId,
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

  // Combine payouts
  for (const { programId, partnerId } of pendingPayouts) {
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

    const periodStart = payoutsToCombine[0].periodStart;
    const periodEnd = payoutsToCombine[payoutsToCombine.length - 1].periodEnd;
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

    // Cancel the other payouts
    // Q: Should we delete them instead?
    await prisma.payout.updateMany({
      where: {
        id: {
          in: payoutsToCombine.slice(1).map((p) => p.id),
        },
      },
      data: {
        status: "canceled",
        description: `This payout was combined with payout ${combinedPayout.id}`,
      },
    });

    // Update all commissions to point to the new combined payout
    await prisma.commission.updateMany({
      where: {
        payoutId: {
          in: payoutsToCombine.map((p) => p.id),
        },
      },
      data: {
        payoutId: combinedPayout.id,
      },
    });
  }
}

main();
