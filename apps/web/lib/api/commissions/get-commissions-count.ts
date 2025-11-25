import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getCommissionsCountQuerySchema } from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { CommissionStatus } from "@dub/prisma/client";
import { z } from "zod";

type CommissionsCountFilters = z.infer<
  typeof getCommissionsCountQuerySchema
> & {
  programId: string;
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
  } = filters;

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

  const commissionsCount = await prisma.commission.groupBy({
    by: ["status"],
    where: {
      earnings: {
        not: 0,
      },
      programId,
      partnerId,
      status: status ?? {
        notIn: [
          CommissionStatus.duplicate,
          CommissionStatus.fraud,
          CommissionStatus.canceled,
        ],
      },
      type,
      payoutId,
      customerId,
      createdAt: {
        gte: startDate.toISOString(),
        lte: endDate.toISOString(),
      },
      ...(groupId && {
        programEnrollment: {
          groupId,
        },
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
      CommissionStatus | "all",
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
