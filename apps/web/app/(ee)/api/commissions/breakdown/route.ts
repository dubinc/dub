import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import { withWorkspace } from "@/lib/auth";
import type { CommissionsBreakdownItem } from "@/lib/swr/use-commissions-breakdown";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { prisma } from "@dub/prisma";
import { CommissionStatus, CommissionType, Prisma } from "@dub/prisma/client";
import { capitalize, parseFilterValue } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const querySchema = analyticsQuerySchema
  .pick({ start: true, end: true, interval: true, timezone: true })
  .extend({
    groupBy: z.enum(["type", "groupId"]),
    status: z.enum(CommissionStatus).optional(),
    partnerId: z.string().optional(),
    groupId: z.string().optional(),
    type: z.string().optional(),
  });

// GET /api/commissions/breakdown
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const {
    start,
    end,
    interval,
    timezone,
    groupBy,
    status,
    partnerId,
    groupId,
    type,
  } = querySchema.parse(searchParams);

  assertValidDateRangeForPlan({
    plan: workspace.plan,
    dataAvailableFrom: workspace.createdAt,
    interval,
    start,
    end,
  });

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

  const partnerFilter = parseFilterValue(partnerId);
  const groupFilter = parseFilterValue(groupId);

  const rawTypeFilter = parseFilterValue(type);
  const validCommissionTypes = new Set(Object.values(CommissionType));

  const validTypeValues = rawTypeFilter
    ? (rawTypeFilter.values.filter((v) =>
        validCommissionTypes.has(v as CommissionType),
      ) as CommissionType[])
    : [];

  if (
    rawTypeFilter?.sqlOperator === "IN" &&
    rawTypeFilter.values.length > 0 &&
    validTypeValues.length === 0
  ) {
    return NextResponse.json([]);
  }

  const typeFilter =
    rawTypeFilter && validTypeValues.length > 0
      ? { ...rawTypeFilter, values: validTypeValues }
      : null;

  const baseWhere = {
    programId,
    createdAt: { gte: startDate, lt: endDate },
    status: status
      ? status
      : {
          notIn: [
            CommissionStatus.duplicate,
            CommissionStatus.fraud,
            CommissionStatus.canceled,
          ],
        },
    ...(partnerFilter && {
      partnerId:
        partnerFilter.sqlOperator === "NOT IN"
          ? { notIn: partnerFilter.values }
          : { in: partnerFilter.values },
    }),
    ...(typeFilter && {
      type:
        typeFilter.sqlOperator === "NOT IN"
          ? { notIn: typeFilter.values }
          : { in: typeFilter.values },
    }),
    ...(groupFilter && {
      programEnrollment: {
        groupId:
          groupFilter.sqlOperator === "NOT IN"
            ? { notIn: groupFilter.values }
            : { in: groupFilter.values },
      },
    }),
  };

  let result: CommissionsBreakdownItem[] = [];

  if (groupBy === "type") {
    const rows = await prisma.commission.groupBy({
      by: ["type"],
      where: baseWhere,
      _sum: { earnings: true },
      _count: { _all: true },
      orderBy: { _sum: { earnings: "desc" } },
    });

    result = rows
      .filter((r) => r.type !== null)
      .map((r) => ({
        key: r.type!,
        label: capitalize(r.type!) ?? r.type!,
        earnings: r._sum.earnings ?? 0,
        count: r._count._all,
      }));
  } else if (groupBy === "groupId") {
    // Single raw SQL query: JOIN Commission → ProgramEnrollment → PartnerGroup
    const conditions: Prisma.Sql[] = [
      Prisma.sql`c.programId = ${programId}`,
      Prisma.sql`c.createdAt >= ${startDate}`,
      Prisma.sql`c.createdAt < ${endDate}`,
      status
        ? Prisma.sql`c.status = ${status}`
        : Prisma.sql`c.status NOT IN (${Prisma.join([
            CommissionStatus.duplicate,
            CommissionStatus.fraud,
            CommissionStatus.canceled,
          ])})`,
    ];

    if (partnerFilter) {
      const list = Prisma.join(
        partnerFilter.values.map((v) => Prisma.sql`${v}`),
      );
      conditions.push(
        partnerFilter.sqlOperator === "NOT IN"
          ? Prisma.sql`c.partnerId NOT IN (${list})`
          : Prisma.sql`c.partnerId IN (${list})`,
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

    if (groupFilter) {
      const list = Prisma.join(groupFilter.values.map((v) => Prisma.sql`${v}`));
      conditions.push(
        groupFilter.sqlOperator === "NOT IN"
          ? Prisma.sql`pe.groupId NOT IN (${list})`
          : Prisma.sql`pe.groupId IN (${list})`,
      );
    }

    const where = Prisma.join(conditions, " AND ");

    const rows = await prisma.$queryRaw<
      {
        groupId: string | null;
        groupName: string | null;
        earnings: bigint;
        count: bigint;
      }[]
    >(
      Prisma.sql`
        SELECT
          pe.groupId,
          pg.name        AS groupName,
          SUM(c.earnings) AS earnings,
          COUNT(c.id)    AS count
        FROM Commission c
        JOIN ProgramEnrollment pe
          ON pe.programId = c.programId AND pe.partnerId = c.partnerId
        LEFT JOIN PartnerGroup pg ON pg.id = pe.groupId
        WHERE ${where}
        GROUP BY pe.groupId, pg.name
        ORDER BY earnings DESC`,
    );

    result = rows.map((r) => ({
      key: r.groupId ?? "ungrouped",
      label: r.groupName ?? "Ungrouped",
      earnings: Number(r.earnings),
      count: Number(r.count),
    }));
  }

  return NextResponse.json(result);
});
