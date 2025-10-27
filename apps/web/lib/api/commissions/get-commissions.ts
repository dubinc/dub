import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getCommissionsQuerySchema } from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { z } from "zod";

type CommissionsFilters = z.infer<typeof getCommissionsQuerySchema> & {
  programId: string;
  includeProgramEnrollment?: boolean; // Decide if we want to fetch the program enrollment data for the partner
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
    page,
    pageSize,
    sortBy,
    sortOrder,
    includeProgramEnrollment = false,
  } = filters;

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
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
          status,
          type,
          customerId,
          payoutId,
          createdAt: {
            gte: startDate.toISOString(),
            lte: endDate.toISOString(),
          },
          ...(groupId && {
            partner: {
              programs: {
                some: {
                  programId,
                  groupId,
                },
              },
            },
          }),
        },
    include: {
      customer: true,
      ...(!includeProgramEnrollment
        ? {
            partner: true,
          }
        : {
            partner: {
              include: {
                programs: {
                  where: {
                    programId,
                  },
                },
              },
            },
          }),
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { [sortBy]: sortOrder },
  });
}
