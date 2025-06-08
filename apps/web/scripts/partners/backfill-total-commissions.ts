import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const commissions = await prisma.commission.groupBy({
    by: ["partnerId", "programId"],
    where: {
      earnings: {
        gt: 0,
      },
      status: {
        in: ["pending", "processed", "paid"],
      },
    },
    _sum: {
      earnings: true,
    },
    orderBy: {
      _sum: {
        earnings: "desc",
      },
    },
    take: 100,
  });

  console.table(commissions);

  for (const commission of commissions) {
    await syncTotalCommissions({
      partnerId: commission.partnerId,
      programId: commission.programId,
    });
  }
}

main();
