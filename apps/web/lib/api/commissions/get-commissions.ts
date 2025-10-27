import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import {
  CommissionEnrichedSchema,
  getCommissionsQuerySchema,
} from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { transformCustomerForCommission } from "../customers/transform-customer";

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
    page,
    pageSize,
    sortBy,
    sortOrder,
  } = filters;

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
  });

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
      customer: true,
      partner: true,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { [sortBy]: sortOrder },
  });

  return z.array(CommissionEnrichedSchema).parse(
    commissions.map((c) => ({
      ...c,
      customer: transformCustomerForCommission(c.customer),
    })),
  );
}
