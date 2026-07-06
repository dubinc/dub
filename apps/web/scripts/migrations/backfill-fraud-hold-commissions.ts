import { PARTNER_LEVEL_FRAUD_RULES } from "@/lib/api/fraud/constants";
import { holdPendingCommissions } from "@/lib/api/fraud/hold-pending-commissions";
import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

const BATCH_SIZE = 100;

// One-time backfill: hold pending commissions for partners who already have pending
// partner-level fraud groups but were not covered by the new hold-on-fraud-event logic.
// Conversion-event fraud holds are applied at commission creation time (customer-scoped).
async function main() {
  let startingAfter: string | undefined;
  let totalPairs = 0;

  while (true) {
    const fraudGroups = await prisma.fraudEventGroup.findMany({
      where: {
        status: "pending",
        type: {
          in: PARTNER_LEVEL_FRAUD_RULES,
        },
        program: {
          workspace: {
            plan: {
              in: ["advanced", "enterprise"],
            },
          },
        },
      },
      select: {
        id: true,
        programId: true,
        partnerId: true,
      },
      take: BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
      ...(startingAfter && {
        skip: 1,
        cursor: {
          id: startingAfter,
        },
      }),
    });

    if (fraudGroups.length === 0) {
      break;
    }

    const uniqueEnrollments = [
      ...new Map(
        fraudGroups.map((g) => [`${g.programId}:${g.partnerId}`, g]),
      ).values(),
    ];

    await holdPendingCommissions(uniqueEnrollments);

    totalPairs += uniqueEnrollments.length;
    console.log(
      `Held pending commissions for ${uniqueEnrollments.length} partner-program pairs (total: ${totalPairs})`,
    );

    if (fraudGroups.length < BATCH_SIZE) {
      break;
    }

    startingAfter = fraudGroups[fraudGroups.length - 1].id;
  }

  console.log(
    `Finished backfill. Processed ${totalPairs} partner-program pairs total.`,
  );
}

main();
