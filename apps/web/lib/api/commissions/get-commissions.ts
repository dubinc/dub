import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getCommissionsQuerySchema } from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { CommissionStatus, FraudEventStatus } from "@dub/prisma/client";
import * as z from "zod/v4";

type CommissionsFilters = z.infer<typeof getCommissionsQuerySchema> & {
  programId: string;
  isHoldStatus?: boolean;
};

export async function getCommissions(filters: CommissionsFilters) {
  const {
    invoiceId,
    programId,
    partnerId,
    status,
    type,
    customerId,
    payoutId,
    groupId,
    start,
    end,
    interval,
    timezone,
    page,
    pageSize,
    sortBy,
    sortOrder,
    isHoldStatus,
  } = filters;

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

  const programEnrollmentFilter = {
    ...(groupId && { groupId }),
    ...(isHoldStatus && {
      fraudEventGroups: {
        some: {
          status: FraudEventStatus.pending,
        },
      },
    }),
  };

  return await prisma.commission.findMany({
    where: invoiceId
      ? {
          invoiceId,
          programId,
        }
      : {
          earnings: {
            not: 0,
          },
          programId,
          partnerId,
          status: statusFilter,
          type,
          customerId,
          payoutId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          ...(Object.keys(programEnrollmentFilter).length > 0 && {
            programEnrollment: programEnrollmentFilter,
          }),
        },
    include: {
      customer: true,
      partner: true,
      programEnrollment: true,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { [sortBy]: sortOrder },
  });
}
