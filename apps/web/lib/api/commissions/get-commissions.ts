import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { prisma } from "@/lib/prisma";
import { getCommissionsQuerySchema } from "@/lib/zod/schemas/commissions";
import { parseFilterValue } from "@dub/utils";
import { CommissionStatus, CommissionType, Prisma } from "@prisma/client";
import * as z from "zod/v4";
import { DubApiError } from "../errors";
import { getFraudEventGroupEventIds } from "../fraud/get-fraud-event-group-event-ids";
import { buildPaginationSql } from "../pagination";
import {
  type CommissionListRow,
  mapCommissionListRow,
} from "./map-commission-list-row";

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

  const { cursorSql, orderBySql, limit, offsetSql, reverse } =
    buildPaginationSql({
      filters,
      alias: "c",
      allowedSortBy: ["createdAt", "amount"],
    });

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

  // Invoice is unique within a program, so we can return the commission directly
  if (invoiceId) {
    return await prisma.commission.findMany({
      where: {
        invoiceId,
        programId,
      },
      include: {
        customer: true,
        partner: true,
        programEnrollment: true,
        payout: {
          select: {
            paidAt: true,
          },
        },
      },
    });
  }

  const conditions: Prisma.Sql[] = [
    Prisma.sql`c.earnings != 0`,
    Prisma.sql`c.programId = ${programId}`,
  ];

  if (partnerFilter) {
    conditions.push(
      partnerFilter.sqlOperator === "NOT IN"
        ? Prisma.sql`c.partnerId NOT IN (${Prisma.join(partnerFilter.values)})`
        : Prisma.sql`c.partnerId IN (${Prisma.join(partnerFilter.values)})`,
    );
  }

  if (status) {
    conditions.push(Prisma.sql`c.status = ${status}`);
  } else if (!(type || customerId || payoutId || partnerId)) {
    conditions.push(
      Prisma.sql`c.status NOT IN (${Prisma.join(
        [
          CommissionStatus.duplicate,
          CommissionStatus.fraud,
          CommissionStatus.canceled,
        ].map((s) => Prisma.sql`${s}`),
      )})`,
    );
  }

  if (typeFilter) {
    const list = Prisma.join(typeFilter.values.map((v) => Prisma.sql`${v}`));

    conditions.push(
      typeFilter.sqlOperator === "NOT IN"
        ? Prisma.sql`c.type NOT IN (${list})`
        : Prisma.sql`c.type IN (${list})`,
    );
  }

  if (customerId) {
    conditions.push(Prisma.sql`c.customerId = ${customerId}`);
  }

  if (payoutId) {
    conditions.push(Prisma.sql`c.payoutId = ${payoutId}`);
  }

  if (eventIds) {
    conditions.push(Prisma.sql`c.eventId IN (${Prisma.join(eventIds)})`);
  }

  if (startDate && endDate) {
    conditions.push(
      Prisma.sql`c.createdAt BETWEEN ${startDate} AND ${endDate}`,
    );
  }

  if (groupFilter) {
    const list = Prisma.join(groupFilter.values.map((v) => Prisma.sql`${v}`));

    conditions.push(
      groupFilter.sqlOperator === "NOT IN"
        ? Prisma.sql`EXISTS (
            SELECT 1 FROM ProgramEnrollment pe
            WHERE pe.programId = c.programId
              AND pe.partnerId = c.partnerId
              AND pe.groupId NOT IN (${list})
          )`
        : Prisma.sql`EXISTS (
            SELECT 1 FROM ProgramEnrollment pe
            WHERE pe.programId = c.programId
              AND pe.partnerId = c.partnerId
              AND pe.groupId IN (${list})
          )`,
    );
  }

  if (partnerTagFilter) {
    const list = Prisma.join(
      partnerTagFilter.values.map((v) => Prisma.sql`${v}`),
    );

    conditions.push(
      partnerTagFilter.sqlOperator === "NOT IN"
        ? Prisma.sql`NOT EXISTS (
            SELECT 1 FROM ProgramPartnerTag ppt
            WHERE ppt.programId = c.programId
              AND ppt.partnerId = c.partnerId
              AND ppt.partnerTagId IN (${list})
          )`
        : Prisma.sql`EXISTS (
            SELECT 1 FROM ProgramPartnerTag ppt
            WHERE ppt.programId = c.programId
              AND ppt.partnerId = c.partnerId
              AND ppt.partnerTagId IN (${list})
          )`,
    );
  }

  const where = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

  const commissions = await prisma.$queryRaw<CommissionListRow[]>`
    SELECT
      c.*,
      cu.id AS customerId,
      cu.name AS customerName,
      cu.email AS customerEmail,
      cu.avatar AS customerAvatar,
      cu.externalId AS customerExternalId,
      cu.stripeCustomerId AS customerStripeCustomerId,
      cu.country AS customerCountry,
      cu.sales AS customerSales,
      cu.saleAmount AS customerSaleAmount,
      cu.createdAt AS customerCreatedAt,
      cu.firstSaleAt AS customerFirstSaleAt,
      cu.subscriptionCanceledAt AS customerSubscriptionCanceledAt,
      pa.id AS partnerId,
      pa.name AS partnerName,
      pa.email AS partnerEmail,
      pa.image AS partnerImage,
      pa.payoutsEnabledAt AS partnerPayoutsEnabledAt,
      pa.country AS partnerCountry,
      pe.groupId AS groupId,
      pe.tenantId AS tenantId,
      py.paidAt AS paidAt
    FROM Commission c
    LEFT JOIN Customer cu 
      ON cu.id = c.customerId
    LEFT JOIN Partner pa 
      ON pa.id = c.partnerId
    LEFT JOIN ProgramEnrollment pe 
      ON pe.programId = c.programId AND pe.partnerId = c.partnerId
    LEFT JOIN Payout py 
      ON py.id = c.payoutId
    ${where}
    ${cursorSql}
    ORDER BY ${orderBySql}
    LIMIT ${limit}
    ${offsetSql}
  `;

  const mapped = commissions.map(mapCommissionListRow);

  // Reverse the result back to the requested order after using the
  // opposite sort direction to emulate Prisma's negative `take` behavior.
  return reverse ? mapped.reverse() : mapped;
}
