import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { prisma } from "@/lib/prisma";
import { getCommissionsQuerySchema } from "@/lib/zod/schemas/commissions";
import { parseFilterValue } from "@dub/utils";
import { CommissionStatus, CommissionType } from "@prisma/client";
import * as z from "zod/v4";
import { DubApiError } from "../errors";
import { buildPaginationQuery } from "../pagination";

type CommissionsFilters = Omit<
  z.infer<typeof getCommissionsQuerySchema>,
  "type"
> & {
  type?: string;
  programId: string;
  fraudEventGroupId?: string;
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
    partnerTagId,
    fraudEventGroupId,
    start,
    end,
    interval,
    timezone,
    startingAfter,
    endingBefore,
  } = filters;

  const paginationQuery = buildPaginationQuery(filters);

  // Validate the provided cursor ID
  const cursorId = startingAfter || endingBefore;

  if (cursorId) {
    const commission = await prisma.commission.findUnique({
      where: {
        id: cursorId,
      },
      select: {
        id: true,
        programId: true,
      },
    });

    if (!commission || commission.programId !== programId) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "Invalid cursor: the provided ID does not exist.",
      });
    }
  }

  // Resolve fraudEventGroupId to customerIds
  let customerIds: string[] | undefined;

  if (fraudEventGroupId) {
    const riskEvents = await prisma.fraudEvent.findMany({
      where: {
        fraudEventGroupId,
        customerId: {
          not: null,
        },
      },
      select: {
        customerId: true,
      },
    });

    customerIds = riskEvents.map((e) => e.customerId!);
  }

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

  const partnerFilter = parseFilterValue(partnerId);
  const groupFilter = parseFilterValue(groupId);
  const partnerTagFilter = parseFilterValue(partnerTagId);

  const validCommissionTypes = new Set(Object.values(CommissionType));
  const rawTypeFilter = parseFilterValue(type);
  if (
    rawTypeFilter?.sqlOperator === "IN" &&
    !rawTypeFilter.values.some((v) =>
      validCommissionTypes.has(v as CommissionType),
    )
  ) {
    return [];
  }
  const typeFilter =
    rawTypeFilter &&
    rawTypeFilter.values.some((v) =>
      validCommissionTypes.has(v as CommissionType),
    )
      ? {
          ...rawTypeFilter,
          values: rawTypeFilter.values.filter((v) =>
            validCommissionTypes.has(v as CommissionType),
          ) as CommissionType[],
        }
      : null;

  const statusFilter = status
    ? status
    : customerId || partnerFilter || typeFilter
      ? undefined
      : {
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
                ? { notIn: typeFilter.values }
                : { in: typeFilter.values },
          }),
          customerId,
          payoutId,
          ...(customerIds?.length && {
            customerId: {
              in: customerIds,
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
    include: {
      customer: true,
      partner: true,
      programEnrollment: true,
    },
    ...paginationQuery,
  });
}
