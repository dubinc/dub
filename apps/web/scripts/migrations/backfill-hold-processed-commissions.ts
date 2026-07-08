import {
  CUSTOMER_LEVEL_FRAUD_RULES,
  PARTNER_LEVEL_FRAUD_RULES,
} from "@/lib/api/fraud/constants";
import { prisma } from "@/lib/prisma";
import { groupBy } from "@dub/utils";
import {
  CommissionStatus,
  FraudEventStatus,
  PayoutStatus,
  Prisma,
} from "@prisma/client";
import "dotenv-flow/config";
import { trackCommissionStatusUpdate } from "../../lib/api/commissions/track-commission-update-activity-log";
import { syncTotalCommissions } from "../../lib/api/partners/sync-total-commissions";
import { retallyPayoutsAmount } from "../../lib/payouts/retally-payouts-amount";

const BATCH_SIZE = 50;

type PartnerLevelFraudRule = (typeof PARTNER_LEVEL_FRAUD_RULES)[number];
type CustomerLevelFraudRule = (typeof CUSTOMER_LEVEL_FRAUD_RULES)[number];

const holdEligibleWhere: Prisma.CommissionWhereInput = {
  status: CommissionStatus.processed,
  payout: {
    status: PayoutStatus.pending,
  },
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

// One-time backfill: hold processed commissions for partners who already have pending
// fraud groups but were not covered by the new hold-on-fraud-event logic.
async function main() {
  let startingAfter: string | undefined;
  let totalHeld = 0;

  while (true) {
    const riskGroups = await prisma.fraudEventGroup.findMany({
      where: {
        status: FraudEventStatus.pending,
        program: {
          slug: "acme",
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

    console.log(`Found ${riskGroups.length} risk groups`);

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

    const payoutIdsToRetallySet = new Set<string>();
    if (commissionWhere.length > 0) {
      while (true) {
        const commissions = await prisma.commission.findMany({
          where: {
            OR: commissionWhere,
            ...holdEligibleWhere,
          },
          select: {
            id: true,
            amount: true,
            earnings: true,
            status: true,
            programId: true,
            partnerId: true,
            payoutId: true,
            program: {
              select: {
                id: true,
                workspaceId: true,
              },
            },
          },
          take: 250,
        });

        if (commissions.length === 0) {
          console.log("No more commissions to update to hold, breaking...");
          break;
        }

        // add payout IDs to retally for later
        for (const { payoutId } of commissions) {
          if (payoutId) payoutIdsToRetallySet.add(payoutId);
        }

        const { count: updatedCount } = await prisma.commission.updateMany({
          where: {
            id: {
              in: commissions.map((c) => c.id),
            },
            ...holdEligibleWhere,
          },
          data: {
            status: CommissionStatus.hold,
            payoutId: null,
          },
        });

        totalHeld += updatedCount;

        if (updatedCount > 0) {
          console.log(`Held ${updatedCount} commissions (total: ${totalHeld})`);

          // updateMany re-checks eligibility, so a commission's status can change between findMany
          // and updateMany (i.e. if their associated payout is updated). Only log/sync rows we actually held.
          let heldCommissions = commissions;

          if (updatedCount < commissions.length) {
            const commissionIds = commissions.map((c) => c.id);

            const heldCommissionIds = await prisma.commission.findMany({
              where: {
                id: {
                  in: commissionIds,
                },
                status: CommissionStatus.hold,
              },
              select: {
                id: true,
              },
            });

            const heldIds = new Set(heldCommissionIds.map(({ id }) => id));

            heldCommissions = commissions.filter((c) => heldIds.has(c.id));
          }

          // Activity logs are scoped to a workspace + program, so batch by program.
          const commissionsByProgram = groupBy(
            heldCommissions,
            (c) => c.programId,
          );

          for (const commissions of Object.values(commissionsByProgram)) {
            const { id: programId, workspaceId } = commissions[0].program;

            await trackCommissionStatusUpdate({
              workspaceId,
              programId,
              commissions,
              newStatus: CommissionStatus.hold,
            });
          }

          const affectedPairs = [
            ...new Map(
              heldCommissions.map((c) => [
                `${c.programId}:${c.partnerId}`,
                { programId: c.programId, partnerId: c.partnerId },
              ]),
            ).values(),
          ];

          await Promise.all(
            affectedPairs.map(({ programId, partnerId }) =>
              syncTotalCommissions({
                programId,
                partnerId,
              }),
            ),
          );
        }
      }
    }

    // need to retally payouts to ensure the payout amount is correct
    await retallyPayoutsAmount(Array.from(payoutIdsToRetallySet));

    startingAfter = riskGroups[riskGroups.length - 1].id;

    if (riskGroups.length < BATCH_SIZE) {
      break;
    }
  }

  console.log(`Finished backfill. Held ${totalHeld} commissions total.`);
}

main();
