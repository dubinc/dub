import { retallyPayoutsAmount } from "@/lib/payouts/retally-payouts-amount";
import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

const DRY_RUN = true;
const programId = "prog_xxx";
const UPDATE_BATCH_SIZE = 500;

async function main() {
  if (programId === "prog_xxx") {
    throw new Error(
      "Set programId before running customers/ascension/update-commissions-paid.ts.",
    );
  }

  const commissions = await prisma.commission.findMany({
    where: {
      programId,
      status: {
        in: ["pending", "processed", "hold"],
      },
      metadata: {
        path: "$.affwpStatus",
        equals: "paid",
      },
      OR: [
        { payoutId: null },
        {
          payout: {
            status: "pending",
          },
        },
      ],
    },
    select: {
      id: true,
      earnings: true,
      payoutId: true,
    },
  });

  if (commissions.length === 0) {
    console.log("No imported paid commissions matched.");
    return;
  }

  const earningsCents = commissions.reduce(
    (total, commission) => total + commission.earnings,
    0,
  );

  console.log(
    `Found ${commissions.length} commissions with affwpStatus "paid" to mark paid.`,
  );
  console.log(
    `Earnings total: ${formatDollars(earningsCents)} (${earningsCents} cents).`,
  );

  if (DRY_RUN) {
    console.log("DRY_RUN is true. No commissions were updated.");
    return;
  }

  const payoutIdsToRetally = [
    ...new Set(
      commissions
        .filter((commission) => commission.payoutId)
        .map((commission) => commission.payoutId!),
    ),
  ];
  const commissionIds = commissions.map((commission) => commission.id);

  let updatedCount = 0;

  for (const batch of chunk(commissionIds, UPDATE_BATCH_SIZE)) {
    const updated = await prisma.commission.updateMany({
      where: {
        id: {
          in: batch,
        },
        status: {
          not: "paid",
        },
      },
      data: {
        payoutId: null,
        status: "paid",
      },
    });

    updatedCount += updated.count;
  }

  await retallyPayoutsAmount(payoutIdsToRetally);

  console.log(`Updated ${updatedCount} commissions to have status "paid".`);

  let deletedActivityLogs = 0;

  for (const batch of chunk(commissionIds, UPDATE_BATCH_SIZE)) {
    const deleted = await prisma.activityLog.deleteMany({
      where: {
        resourceType: "commission",
        resourceId: {
          in: batch,
        },
      },
    });

    deletedActivityLogs += deleted.count;
  }

  console.log(`Deleted ${deletedActivityLogs} activity logs for commissions.`);
}

function formatDollars(cents: number) {
  const sign = cents < 0 ? "-" : "";

  return `${sign}$${(Math.abs(cents) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function chunk<T>(items: T[], size: number) {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

main();
