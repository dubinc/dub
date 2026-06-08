import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";

const BATCH_SIZE = 500;
const DRY_RUN = process.env.DRY_RUN !== "false"; // default to dry-run for safety

// Reconciles commissions that are stuck at "processed" even though their payout
// is already "completed" (money has moved). Run via:
//   pnpm script payouts/backfill-completed-payout-commissions
// Set DRY_RUN=false to actually apply the updates.
async function main() {
  const where: Prisma.CommissionWhereInput = {
    status: "processed",
    payout: {
      status: "completed",
    },
  };

  const total = await prisma.commission.count({ where });
  console.log(`${total} commissions to reconcile (DRY_RUN=${DRY_RUN})`);

  if (DRY_RUN || total === 0) {
    return;
  }

  let totalUpdated = 0;
  while (true) {
    const batch = await prisma.commission.findMany({
      where,
      select: { id: true },
      take: BATCH_SIZE,
    });

    if (batch.length === 0) {
      break;
    }

    const { count } = await prisma.commission.updateMany({
      where: {
        id: {
          in: batch.map((c) => c.id),
        },
      },
      data: {
        status: "paid",
      },
    });

    totalUpdated += count;
    console.log(`Updated ${totalUpdated}/${total}...`);
  }

  console.log(`Done. Updated ${totalUpdated} commissions to "paid".`);
}

main();
