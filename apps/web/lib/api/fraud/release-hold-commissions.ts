import { triggerAggregateDueCommissionsCronJob } from "@/lib/actions/partners/trigger-aggregate-due-commissions";
import { trackCommissionStatusUpdate } from "@/lib/api/commissions/track-commission-update-activity-log";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import {
  CommissionStatus,
  FraudEventStatus,
  FraudRuleType,
  Prisma,
} from "@prisma/client";
import {
  CUSTOMER_LEVEL_FRAUD_RULES,
  PARTNER_LEVEL_FRAUD_RULES,
} from "./constants";

/**
 * Release hold commissions after fraud groups are resolved or expired.
 *
 * Called with the group IDs that were just cleared. Before releasing anything,
 * we check whether the partner still has other pending fraud groups:
 *
 * 1. Partner-level groups (e.g. duplicate account, cross-program ban) — if any
 *    remain pending, all hold commissions stay on hold.
 * 2. Conversion-event groups (e.g. matching customer email) — commissions tied
 *    to customers in those groups stay on hold; only unrelated commissions are
 *    released.
 *
 * Eligible commissions move from `hold` → `pending`, then we log the status
 * change, sync partner commissions stats, trigger
 * the aggregate due commissions cron job, and fire partner-metrics workflows.
 */
export async function releaseHoldCommissions({
  programId,
  partnerId,
  resolvedGroupIds,
}: {
  programId: string;
  partnerId: string;
  // Includes both resolved and expired fraud groups.
  resolvedGroupIds: string[];
}) {
  if (resolvedGroupIds.length === 0) {
    return 0;
  }

  const otherPendingGroups = await prisma.fraudEventGroup.findMany({
    where: {
      programId,
      partnerId,
      status: FraudEventStatus.pending,
      id: {
        notIn: resolvedGroupIds,
      },
    },
    select: {
      type: true,
      fraudEvents: {
        select: {
          customerId: true,
        },
      },
    },
  });

  const hasOtherPendingPartnerLevelGroup = otherPendingGroups.some((g) =>
    (PARTNER_LEVEL_FRAUD_RULES as readonly FraudRuleType[]).includes(g.type),
  );

  if (hasOtherPendingPartnerLevelGroup) {
    console.log(
      `Partner ${partnerId} has other pending partner-level groups, skipping release of hold commissions`,
    );
    return 0;
  }

  const blockedCustomerIds = new Set(
    otherPendingGroups
      .filter((g) =>
        CUSTOMER_LEVEL_FRAUD_RULES.includes(
          g.type as (typeof CUSTOMER_LEVEL_FRAUD_RULES)[number],
        ),
      )
      .flatMap((g) =>
        g.fraudEvents
          .map((e) => e.customerId)
          .filter((id): id is string => id !== null),
      ),
  );

  const releaseWhere: Prisma.CommissionWhereInput = {
    programId,
    partnerId,
    status: CommissionStatus.hold,
  };

  if (blockedCustomerIds.size > 0) {
    releaseWhere.OR = [
      {
        customerId: null, // custom commissions
      },
      {
        customerId: {
          notIn: [...blockedCustomerIds],
        },
      },
    ];
  }

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    select: {
      workspaceId: true,
    },
  });

  let totalReleased = 0;

  while (true) {
    const commissionsToRelease = await prisma.commission.findMany({
      where: releaseWhere,
      select: {
        id: true,
        amount: true,
        earnings: true,
        status: true,
      },
      take: 250,
    });

    if (commissionsToRelease.length === 0) {
      console.log(
        `No hold commissions to release for partner ${partnerId} in program ${programId}`,
      );
      break;
    }

    // Update the commissions to pending
    const { count: updatedCount } = await prisma.commission.updateMany({
      where: {
        id: {
          in: commissionsToRelease.map((c) => c.id),
        },
        status: CommissionStatus.hold,
      },
      data: {
        status: CommissionStatus.pending,
      },
    });

    if (updatedCount > 0) {
      console.log(`Released ${updatedCount} hold commissions`);
      totalReleased += updatedCount;

      // Get the released commissions
      const releasedCommissions =
        updatedCount < commissionsToRelease.length
          ? await prisma.commission
              .findMany({
                where: {
                  id: {
                    in: commissionsToRelease.map((c) => c.id),
                  },
                  status: CommissionStatus.pending,
                },
                select: {
                  id: true,
                  amount: true,
                  earnings: true,
                  status: true,
                },
              })
              .then((commissions) =>
                commissions.map((c) => ({
                  ...c,
                  // need to make sure the releasedCommissions have the old "hold" status for the status update log
                  status: CommissionStatus.hold,
                })),
              )
          : commissionsToRelease;

      const releasedEarnings = releasedCommissions.reduce(
        (sum, commission) => sum + commission.earnings,
        0,
      );

      const results = await Promise.allSettled([
        trackCommissionStatusUpdate({
          workspaceId: program.workspaceId,
          programId,
          commissions: releasedCommissions,
          newStatus: CommissionStatus.pending,
        }),
        syncTotalCommissions({
          partnerId,
          programId,
        }),
        triggerAggregateDueCommissionsCronJob(programId),
        // should always be > 0, but just in case
        releasedEarnings > 0 &&
          executeWorkflows({
            trigger: "partnerMetricsUpdated",
            reason: "commission",
            identity: {
              workspaceId: program.workspaceId,
              programId,
              partnerId,
            },
            metrics: {
              current: {
                commissions: releasedEarnings,
              },
            },
          }),
      ]);

      console.log(
        `Summary of releaseHoldCommissions: ${JSON.stringify(
          [
            "trackCommissionStatusUpdate",
            "syncTotalCommissions",
            "triggerAggregateDueCommissions",
            "executeWorkflows",
          ].map((step, index) => ({
            step,
            result: results[index],
          })),
        )}`,
      );
    }
  }

  return totalReleased;
}

// Groups resolved/expired fraud groups by program+partner and enqueues a cron
// job per pair so releaseHoldCommissions runs asynchronously via QStash.
export async function queueReleaseHoldCommissions(riskGroupIds: string[]) {
  if (riskGroupIds.length === 0) {
    return 0;
  }

  const riskGroups = await prisma.fraudEventGroup.findMany({
    where: {
      id: {
        in: riskGroupIds,
      },
      status: {
        in: [FraudEventStatus.resolved, FraudEventStatus.expired],
      },
    },
    select: {
      id: true,
      programId: true,
      partnerId: true,
    },
  });

  if (riskGroups.length === 0) {
    return 0;
  }

  const pairs = new Map<
    string,
    { programId: string; partnerId: string; resolvedGroupIds: string[] }
  >();

  for (const riskGroup of riskGroups) {
    const key = `${riskGroup.programId}:${riskGroup.partnerId}`;
    const existing = pairs.get(key);

    if (existing) {
      existing.resolvedGroupIds.push(riskGroup.id);
    } else {
      pairs.set(key, {
        programId: riskGroup.programId,
        partnerId: riskGroup.partnerId,
        resolvedGroupIds: [riskGroup.id],
      });
    }
  }

  const jobs = [...pairs.values()].map(
    ({ programId, partnerId, resolvedGroupIds }) => ({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/fraud/release-hold-commissions`,
      method: "POST" as const,
      body: {
        programId,
        partnerId,
        resolvedGroupIds,
      },
    }),
  );

  await qstash.batchJSON(jobs);

  return jobs.length;
}
