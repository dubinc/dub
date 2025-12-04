import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getCommissionsQuerySchema } from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { CommissionStatus } from "@dub/prisma/client";
import { z } from "zod";

type CommissionsFilters = z.infer<typeof getCommissionsQuerySchema> & {
  programId: string;
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
  } = filters;

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

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
          status: status ?? {
            notIn: [
              CommissionStatus.duplicate,
              CommissionStatus.fraud,
              CommissionStatus.canceled,
            ],
          },
          type,
          customerId,
          payoutId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          ...(groupId && {
            programEnrollment: {
              groupId,
            },
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
