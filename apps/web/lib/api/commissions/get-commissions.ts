import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getCommissionsQuerySchema } from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { DubApiError } from "../errors";

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

function getPaginationOptions({
  page,
  pageSize,
  startingAfter,
  endingBefore,
  sortBy,
  sortOrder,
}: CommissionsFilters) {
  const useCursorPagination = !!startingAfter || !!endingBefore;

  if (startingAfter && endingBefore) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message:
        "You cannot use both startingAfter and endingBefore at the same time.",
    });
  }

  const effectiveSortOrder = useCursorPagination ? "desc" : sortOrder;
  const effectiveSortBy = useCursorPagination ? "createdAt" : sortBy;
  const effectiveTake = useCursorPagination
    ? endingBefore
      ? -pageSize // Before cursor
      : pageSize // After cursor
    : pageSize;

  const prismaQuery: Prisma.CommissionFindManyArgs = {
    // Use cursor pagination
    ...(useCursorPagination && {
      cursor: {
        id: startingAfter || endingBefore,
      },
      skip: 1,
    }),

    // Use offset pagination
    ...(!useCursorPagination && {
      skip: (page - 1) * pageSize,
    }),

    orderBy: {
      [effectiveSortBy]: effectiveSortOrder,
    },

    take: effectiveTake,
  };

  return prismaQuery;
}
