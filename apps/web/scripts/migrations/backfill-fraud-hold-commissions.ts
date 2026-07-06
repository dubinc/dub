import {
  CUSTOMER_LEVEL_FRAUD_RULES,
  PARTNER_LEVEL_FRAUD_RULES,
} from "@/lib/api/fraud/constants";
import { prisma } from "@/lib/prisma";
import { CommissionStatus, FraudEventStatus, Prisma } from "@prisma/client";
import "dotenv-flow/config";

const BATCH_SIZE = 50;

type PartnerLevelFraudRule = (typeof PARTNER_LEVEL_FRAUD_RULES)[number];
type CustomerLevelFraudRule = (typeof CUSTOMER_LEVEL_FRAUD_RULES)[number];

const holdEligibleWhere: Prisma.CommissionWhereInput = {
  status: CommissionStatus.pending,
  earnings: {
    gt: 0,
  },
  program: {
    workspace: {
      plan: {
        in: ["enterprise", "advanced"],
      },
    },
  },
};

// One-time backfill: hold pending commissions for partners who already have pending
// fraud groups but were not covered by the new hold-on-fraud-event logic.
async function main() {
  let startingAfter: string | undefined;
  let totalHeld = 0;

  while (true) {
    const riskGroups = await prisma.fraudEventGroup.findMany({
      where: {
        status: FraudEventStatus.pending,
        program: {
          workspace: {
            plan: {
              in: ["enterprise", "advanced"],
            },
          },
        },
      },
      include: {
        fraudEvents: {
          select: {
            customerId: true,
            eventId: true,
          },
        },
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

    if (riskGroups.length === 0) {
      break;
    }

    const commissionWhere: Prisma.CommissionWhereInput[] = [];

    for (const riskGroup of riskGroups) {
      if (
        PARTNER_LEVEL_FRAUD_RULES.includes(
          riskGroup.type as PartnerLevelFraudRule,
        )
      ) {
        commissionWhere.push({
          programId: riskGroup.programId,
          partnerId: riskGroup.partnerId,
        });

        continue;
      }

      if (
        CUSTOMER_LEVEL_FRAUD_RULES.includes(
          riskGroup.type as CustomerLevelFraudRule,
        )
      ) {
        const customerIds = riskGroup.fraudEvents
          .map((event) => event.customerId)
          .filter((id): id is string => id !== null);

        if (customerIds.length > 0) {
          commissionWhere.push({
            programId: riskGroup.programId,
            partnerId: riskGroup.partnerId,
            customerId: {
              in: customerIds,
            },
          });
        }
      }
    }

    if (commissionWhere.length > 0) {
      const commissions = await prisma.commission.findMany({
        where: {
          OR: commissionWhere,
          ...holdEligibleWhere,
        },
        select: {
          id: true,
        },
      });

      if (commissions.length > 0) {
        const { count: updatedCount } = await prisma.commission.updateMany({
          where: {
            id: {
              in: commissions.map((c) => c.id),
            },
            ...holdEligibleWhere,
          },
          data: {
            status: CommissionStatus.hold,
          },
        });

        totalHeld += updatedCount;

        if (updatedCount > 0) {
          console.log(`Held ${updatedCount} commissions (total: ${totalHeld})`);
        }
      }
    }

    startingAfter = riskGroups[riskGroups.length - 1].id;

    if (riskGroups.length < BATCH_SIZE) {
      break;
    }
  }

  console.log(`Finished backfill. Held ${totalHeld} commissions total.`);
}

main();
