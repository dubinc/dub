import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getCommissionsQuerySchema } from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { getPaginationOptions } from "../pagination";

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
          status,
          type,
          customerId,
          payoutId,
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
    include: {
      customer: true,
      partner: true,
      programEnrollment: true,
    },
    ...getPaginationOptions(filters),
  });
}
