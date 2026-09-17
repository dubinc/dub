import { prisma } from "@/lib/prisma";
import { CommissionSource } from "@prisma/client";
import "dotenv-flow/config";

const BATCH_SIZE = 500;

// Backfill Commission.source = user when:
// - userId is set (manual / dashboard creates), or
// - the commission is linked from a BountySubmission
async function main() {
  let totalUpdated = 0;

  while (true) {
    const commissions = await prisma.commission.findMany({
      where: {
        source: null,
        OR: [
          {
            userId: {
              not: null,
            },
          },
          {
            bountySubmission: {
              isNot: null,
            },
          },
        ],
      },
      select: {
        id: true,
      },
      take: BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
    });

    if (commissions.length === 0) {
      break;
    }

    const { count } = await prisma.commission.updateMany({
      where: {
        id: {
          in: commissions.map(({ id }) => id),
        },
        source: null,
      },
      data: {
        source: CommissionSource.user,
      },
    });

    totalUpdated += count;
    console.log(`Updated ${count} commissions (total: ${totalUpdated})`);
  }

  console.log(`Done. Set source=user on ${totalUpdated} commissions.`);
}

main();
