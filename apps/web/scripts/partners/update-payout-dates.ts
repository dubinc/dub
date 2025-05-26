import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  // get all payouts with periodEnd that ends in 00:00:00.000
  const payoutsToUpdate = await prisma.payout.findMany({
    where: {
      periodEnd: new Date("2024-07-01T00:00:00.000Z"),
    },
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 250,
  });

  console.table(payoutsToUpdate);

  const res = await prisma.payout.updateMany({
    where: {
      id: {
        in: payoutsToUpdate.map((p) => p.id),
      },
    },
    data: {
      periodEnd: new Date("2024-06-30T23:59:59.999Z"),
    },
  });

  console.log(`Updated ${res.count} payouts.`);
}

main();
