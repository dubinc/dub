import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { prisma } from "@/lib/prisma";
import { getCommissionsCountQuerySchema } from "@/lib/zod/schemas/commissions";
import { parseFilterValue } from "@dub/utils";
import { CommissionStatus, CommissionType } from "@prisma/client";
import * as z from "zod/v4";
import { getFraudEventGroupEventIds } from "../fraud/get-fraud-event-group-event-ids";

type CommissionsCountFilters = z.infer<
  typeof getCommissionsCountQuerySchema
> & {
  programId: string;
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
    partnerTagId,
    fraudEventGroupId,
    start,
    end,
    interval,
    timezone,
    programId,
  } = filters;

  // Filter the commissions based on the risk event group
  const eventIds = fraudEventGroupId
    ? await getFraudEventGroupEventIds({
        fraudEventGroupId,
        programId,
      })
    : undefined;

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

  const groupFilter = parseFilterValue(groupId);
  const partnerTagFilter = parseFilterValue(partnerTagId);

  const statusFilter = status ?? {
    notIn: [
      CommissionStatus.duplicate,
      CommissionStatus.fraud,
      CommissionStatus.canceled,
    ],
  };

  const programEnrollmentFilter = {
    ...(groupFilter && {
      groupId:
        groupFilter.sqlOperator === "NOT IN"
          ? { notIn: groupFilter.values }
          : { in: groupFilter.values },
    }),
    ...(partnerTagFilter && {
      programPartnerTags:
        partnerTagFilter.sqlOperator === "NOT IN"
          ? { none: { partnerTagId: { in: partnerTagFilter.values } } }
          : { some: { partnerTagId: { in: partnerTagFilter.values } } },
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

  return counts;
}
