import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const payouts = await prisma.payout.findMany({
    where: {
      status: {
        notIn: ["pending", "canceled"],
      },
      mode: null,
    },
    take: 100,
  });

  const res = await prisma.payout.updateMany({
    where: {
      id: { in: payouts.map((payout) => payout.id) },
    },
    data: {
      mode: "internal",
    },
  });

  console.log(res);
}

main();
