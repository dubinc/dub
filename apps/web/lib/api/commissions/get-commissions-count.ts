import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getCommissionsCountQuerySchema } from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import {
  CommissionStatus,
  CommissionType,
  FraudEventStatus,
} from "@dub/prisma/client";
import { parseFilterValue } from "@dub/utils";
import * as z from "zod/v4";

type CommissionsCountFilters = z.infer<
  typeof getCommissionsCountQuerySchema
> & {
  programId: string;
  isHoldStatus?: boolean;
  fraudEventGroupId?: string;
};

export async function getCommissionsCount(filters: CommissionsCountFilters) {
  const {
    status,
    type,
    partnerId,
    payoutId,
    customerId,
    groupId,
    fraudEventGroupId,
    start,
    end,
    interval,
    timezone,
    programId,
    isHoldStatus,
  } = filters;

  // Resolve fraudEventGroupId to eventIds
  let eventIds: string[] | undefined;

  if (fraudEventGroupId) {
    const fraudEvents = await prisma.fraudEvent.findMany({
      where: {
        fraudEventGroupId,
        eventId: {
          not: null,
        },
      },
      select: {
        eventId: true,
      },
    });

    eventIds = fraudEvents.map((e) => e.eventId!);
  }

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

  const statusFilter = isHoldStatus
    ? { in: [CommissionStatus.pending, CommissionStatus.processed] }
    : status ?? {
        notIn: [
          CommissionStatus.duplicate,
          CommissionStatus.fraud,
          CommissionStatus.canceled,
        ],
      };

  const groupFilter = parseFilterValue(groupId);

  const programEnrollmentFilter = {
    ...(groupFilter && {
      groupId:
        groupFilter.sqlOperator === "NOT IN"
          ? { notIn: groupFilter.values }
          : { in: groupFilter.values },
    }),
    ...(isHoldStatus && {
      fraudEventGroups: {
        some: {
          status: FraudEventStatus.pending,
        },
      },
    }),
  };

  const partnerFilter = parseFilterValue(partnerId);
  const customerFilter = parseFilterValue(customerId);
  const typeFilter = parseFilterValue(type);

  const commissionsCount = await prisma.commission.groupBy({
    by: ["status"],
    where: {
      earnings: {
        not: 0,
      },
      programId,
      ...(partnerFilter && {
        partnerId:
          partnerFilter.sqlOperator === "NOT IN"
            ? { notIn: partnerFilter.values }
            : { in: partnerFilter.values },
      }),
      status: statusFilter,
      ...(typeFilter && {
        type:
          typeFilter.sqlOperator === "NOT IN"
            ? { notIn: typeFilter.values as CommissionType[] }
            : { in: typeFilter.values as CommissionType[] },
      }),
      payoutId,
      ...(customerFilter && {
        customerId:
          customerFilter.sqlOperator === "NOT IN"
            ? { notIn: customerFilter.values }
            : { in: customerFilter.values },
      }),
      ...(eventIds && {
        eventId: {
          in: eventIds,
        },
      }),
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
      ...(Object.keys(programEnrollmentFilter).length > 0 && {
        programEnrollment: programEnrollmentFilter,
      }),
    },
    _count: true,
    _sum: {
      amount: true,
      earnings: true,
    },
  });

  const counts = commissionsCount.reduce(
    (acc, p) => {
      acc[p.status] = {
        count: p._count,
        amount: p._sum.amount ?? 0,
        earnings: p._sum.earnings ?? 0,
      };
      return acc;
    },
    {} as Record<
      CommissionStatus | "all" | "hold",
      {
        count: number;
        amount: number;
        earnings: number;
      }
    >,
  );

  // fill in missing statuses with 0
  Object.values(CommissionStatus).forEach((status) => {
    if (!(status in counts)) {
      counts[status] = {
        count: 0,
        amount: 0,
        earnings: 0,
      };
    }
  });

  counts.all = commissionsCount.reduce(
    (acc, p) => ({
      count: acc.count + p._count,
      amount: acc.amount + (p._sum.amount ?? 0),
      earnings: acc.earnings + (p._sum.earnings ?? 0),
    }),
    { count: 0, amount: 0, earnings: 0 },
  );

  return counts;
}
