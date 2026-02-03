import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getCommissionsCountQuerySchema } from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { CommissionStatus, FraudEventStatus } from "@dub/prisma/client";
import * as z from "zod/v4";

type CommissionsCountFilters = z.infer<
  typeof getCommissionsCountQuerySchema
> & {
  programId: string;
  isHold?: boolean;
};

export async function getCommissionsCount(filters: CommissionsCountFilters) {
  const {
    status,
    type,
    partnerId,
    payoutId,
    customerId,
    groupId,
    start,
    end,
    interval,
    timezone,
    programId,
    isHold,
  } = filters;

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

  const statusFilter = isHold
    ? { in: [CommissionStatus.pending, CommissionStatus.processed] }
    : status ?? {
        notIn: [
          CommissionStatus.duplicate,
          CommissionStatus.fraud,
          CommissionStatus.canceled,
        ],
      };

  const programEnrollmentFilter = {
    ...(groupId && { groupId }),
    ...(isHold && {
      fraudEventGroups: {
        some: {
          status: FraudEventStatus.pending,
        },
      },
    }),
  };

  const commissionsCount = await prisma.commission.groupBy({
    by: ["status"],
    where: {
      earnings: {
        not: 0,
      },
      programId,
      partnerId,
      status: statusFilter,
      type,
      payoutId,
      customerId,
      createdAt: {
        gte: startDate,
        lte: endDate,
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

  // Calculate hold count (pending/processed commissions for partners with pending fraud events)
  if (isHold) {
    counts.hold = counts.all;
  } else {
    const holdCount = await prisma.commission.aggregate({
      where: {
        earnings: { not: 0 },
        programId,
        partnerId,
        status: { in: [CommissionStatus.pending, CommissionStatus.processed] },
        type,
        payoutId,
        customerId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        programEnrollment: {
          ...(groupId && { groupId }),
          fraudEventGroups: {
            some: {
              status: FraudEventStatus.pending,
            },
          },
        },
      },
      _count: { _all: true },
      _sum: {
        amount: true,
        earnings: true,
      },
    });

    counts.hold = {
      count: holdCount._count._all,
      amount: holdCount._sum?.amount ?? 0,
      earnings: holdCount._sum?.earnings ?? 0,
    };
  }

  return counts;
}
