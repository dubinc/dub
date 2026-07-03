import { trackCommissionStatusUpdate } from "@/lib/api/commissions/track-commission-update-activity-log";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { prisma } from "@/lib/prisma";
import { FraudEventStatus, FraudRuleType, Prisma } from "@prisma/client";
import { FRAUD_RULES_BY_TYPE, PARTNER_LEVEL_FRAUD_RULES } from "./constants";

// When fraud groups are resolved or expired, move eligible hold commissions back to pending
export async function releaseHoldCommissions(riskGroupIds: string[]) {
  if (riskGroupIds.length === 0) {
    return 0;
  }

  const riskGroups = await prisma.fraudEventGroup.findMany({
    where: {
      id: {
        in: riskGroupIds,
      },
    },
    select: {
      id: true,
      programId: true,
      partnerId: true,
      type: true,
      program: {
        select: {
          workspaceId: true,
        },
      },
    },
  });

  if (riskGroups.length === 0) {
    return 0;
  }

  let releasedCount = 0;

  const partnerProgramKeys = [
    ...new Set(riskGroups.map((g) => `${g.programId}:${g.partnerId}`)),
  ];

  for (const key of partnerProgramKeys) {
    const [programId, partnerId] = key.split(":");

    const otherPendingGroups = await prisma.fraudEventGroup.findMany({
      where: {
        programId,
        partnerId,
        status: FraudEventStatus.pending,
        id: {
          notIn: riskGroupIds,
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
      continue;
    }

    const blockedCustomerIds = new Set(
      otherPendingGroups
        .filter((g) => FRAUD_RULES_BY_TYPE[g.type]?.scope === "conversionEvent")
        .flatMap((g) =>
          g.fraudEvents
            .map((e) => e.customerId)
            .filter((id): id is string => id !== null),
        ),
    );

    const groupsForPartner = riskGroups.filter(
      (g) => g.programId === programId && g.partnerId === partnerId,
    );

    const releaseWhere: Prisma.CommissionWhereInput = {
      programId,
      partnerId,
      status: "hold",
    };

    if (blockedCustomerIds.size > 0) {
      releaseWhere.OR = [
        {
          customerId: null,
        },
        {
          customerId: {
            notIn: [...blockedCustomerIds],
          },
        },
      ];
    }

    const commissionsToRelease = await prisma.commission.findMany({
      where: releaseWhere,
      select: {
        id: true,
        amount: true,
        earnings: true,
        status: true,
      },
    });

    if (commissionsToRelease.length === 0) {
      continue;
    }

    await prisma.commission.updateMany({
      where: {
        id: {
          in: commissionsToRelease.map((c) => c.id),
        },
      },
      data: {
        status: "pending",
      },
    });

    await trackCommissionStatusUpdate({
      workspaceId: groupsForPartner[0].program.workspaceId,
      programId,
      commissions: commissionsToRelease,
      newStatus: "pending",
    });

    await syncTotalCommissions({
      partnerId,
      programId,
    });

    releasedCount += commissionsToRelease.length;
  }

  return releasedCount;
}
