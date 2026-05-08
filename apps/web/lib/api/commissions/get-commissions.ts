import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getCommissionsQuerySchema } from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import {
  CommissionStatus,
  CommissionType,
  FraudEventStatus,
} from "@dub/prisma/client";
import { parseFilterValue } from "@dub/utils";
import * as z from "zod/v4";
import { DubApiError } from "../errors";
import { buildPaginationQuery } from "../pagination";

type CommissionsFilters = Omit<
  z.infer<typeof getCommissionsQuerySchema>,
  "type"
> & {
  type?: string;
  programId: string;
  isHoldStatus?: boolean;
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
    isHoldStatus,
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

  // Resolve fraudEventGroupId to eventIds
  let eventIds: string[] | undefined;

  if (fraudEventGroupId) {
    const fraudEvents = await prisma.fraudEvent.findMany({
      where: {
        fraudEventGroupId,
        eventId: {
          not: null,
        },
      },
      select: {
        eventId: true,
      },
    });

    eventIds = fraudEvents.map((e) => e.eventId!);
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

  const statusFilter = isHoldStatus
    ? { in: [CommissionStatus.pending, CommissionStatus.processed] }
    : status
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
    include: {
      customer: true,
      partner: true,
      programEnrollment: true,
    },
    ...paginationQuery,
  });
}
