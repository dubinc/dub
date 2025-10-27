import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getCommissionsQuerySchema } from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { z } from "zod";

type CommissionFilters = Omit<
  z.infer<typeof getCommissionsQuerySchema>,
  "page" | "pageSize"
> & {
  programId: string;
};

export async function* fetchCommissionsBatch(
  filters: CommissionFilters,
  batchSize: number = 1000,
) {
  const {
    status,
    type,
    customerId,
    payoutId,
    partnerId,
    groupId,
    invoiceId,
    sortBy,
    sortOrder,
    start,
    end,
    interval,
    programId,
  } = filters;

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
  });

  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const commissions = await prisma.commission.findMany({
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
        customer: {
          select: {
            name: true,
            email: true,
            externalId: true,
          },
        },
        partner: {
          select: {
            name: true,
            email: true,
            programs: {
              select: {
                tenantId: true,
              },
              where: {
                programId,
              },
            },
          },
        },
      },
      skip,
      take: batchSize,
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    if (commissions.length > 0) {
      yield { commissions };
      skip += batchSize;
      hasMore = commissions.length === batchSize;
    } else {
      hasMore = false;
    }
  }
}

