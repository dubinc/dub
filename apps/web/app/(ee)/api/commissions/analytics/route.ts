import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import { withWorkspace } from "@/lib/auth";
import {
  commissionAnalyticsQuerySchema,
  commissionAnalyticsSchema,
} from "@/lib/commissions/schema";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import type { CommissionAnalyticsQuery } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { CommissionStatus, CommissionType, Prisma } from "@dub/prisma/client";
import { capitalize, parseFilterValue } from "@dub/utils";
import { format } from "date-fns/format";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

type CommissionTimeseriesRow = {
  start: string;
  earnings: bigint;
  count: bigint;
};

type CommissionGroupIdQueryRow = {
  groupId: string | null;
  earnings: bigint;
  count: bigint;
};

const excludedStatuses = [
  CommissionStatus.duplicate,
  CommissionStatus.fraud,
  CommissionStatus.canceled,
] as const;

function commissionSqlConditions({
  programId,
  startDate,
  endDate,
  status,
  partnerFilter,
  typeFilter,
  groupIdParam,
}: {
  programId: string;
  startDate: Date;
  endDate: Date;
  status: CommissionStatus | undefined;
  partnerFilter: ReturnType<typeof parseFilterValue>;
  typeFilter: ReturnType<typeof parseFilterValue> | null;
  groupIdParam: string | undefined;
}): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`c.programId = ${programId}`,
    Prisma.sql`c.createdAt >= ${startDate}`,
    Prisma.sql`c.createdAt < ${endDate}`,
    status
      ? Prisma.sql`c.status = ${status}`
      : Prisma.sql`c.status NOT IN (${Prisma.join([...excludedStatuses])})`,
  ];

  if (partnerFilter) {
    const list = Prisma.join(partnerFilter.values.map((v) => Prisma.sql`${v}`));
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

  if (groupIdParam) {
    const groupFilter = parseFilterValue(groupIdParam);
    if (groupFilter) {
      const list = Prisma.join(groupFilter.values.map((v) => Prisma.sql`${v}`));
      const op =
        groupFilter.sqlOperator === "NOT IN"
          ? Prisma.sql`NOT IN`
          : Prisma.sql`IN`;
      conditions.push(Prisma.sql`EXISTS (
        SELECT 1 FROM ProgramEnrollment pe
        WHERE pe.programId = c.programId
          AND pe.partnerId = c.partnerId
          AND pe.groupId ${op} (${list})
      )`);
    }
  }

  return conditions;
}

// GET /api/commissions/analytics
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const parsed = commissionAnalyticsQuerySchema.parse(searchParams);
  const { groupBy } = parsed;

  if (groupBy === "timeseries") {
    return byTimeseries({ workspace, programId, parsed });
  }

  assertValidDateRangeForPlan({
    plan: workspace.plan,
    dataAvailableFrom: workspace.createdAt,
    interval: parsed.interval,
    start: parsed.start,
    end: parsed.end,
  });

  const { startDate, endDate } = getStartEndDates({
    interval: parsed.interval,
    start: parsed.start,
    end: parsed.end,
    timezone: parsed.timezone,
  });

  if (groupBy === "type") {
    return byType({ programId, parsed, startDate, endDate });
  }

  if (groupBy === "groupId") {
    return byGroupId({ programId, parsed, startDate, endDate });
  }

  if (groupBy === "partnerId") {
    return byPartnerId({ programId, parsed, startDate, endDate });
  }

  return NextResponse.json(null);
});

async function byType({
  programId,
  parsed,
  startDate,
  endDate,
}: {
  programId: string;
  parsed: CommissionAnalyticsQuery;
  startDate: Date;
  endDate: Date;
}) {
  const { status, partnerId, groupId, type } = parsed;
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
    return NextResponse.json(commissionAnalyticsSchema.type.parse([]));
  }

  const typeFilter =
    rawTypeFilter && validTypeValues.length > 0
      ? { ...rawTypeFilter, values: validTypeValues }
      : null;

  const baseWhere: Prisma.CommissionWhereInput = {
    programId,
    createdAt: { gte: startDate, lt: endDate },
    status: status ? status : { notIn: [...excludedStatuses] },
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

  const rows = await prisma.commission.groupBy({
    by: ["type"],
    where: baseWhere,
    _sum: { earnings: true },
    _count: { _all: true },
    orderBy: { _sum: { earnings: "desc" } },
  });

  const result = rows
    .filter((r) => r.type !== null)
    .map((r) => ({
      key: r.type!,
      label: capitalize(r.type!) ?? r.type!,
      earnings: r._sum.earnings ?? 0,
      count: r._count._all,
    }));

  return NextResponse.json(commissionAnalyticsSchema.type.parse(result));
}

async function byGroupId({
  programId,
  parsed,
  startDate,
  endDate,
}: {
  programId: string;
  parsed: CommissionAnalyticsQuery;
  startDate: Date;
  endDate: Date;
}) {
  const { status, partnerId, groupId, type } = parsed;
  const partnerFilter = parseFilterValue(partnerId);

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
    return NextResponse.json(commissionAnalyticsSchema.groupId.parse([]));
  }

  const typeFilter =
    rawTypeFilter && validTypeValues.length > 0
      ? { ...rawTypeFilter, values: validTypeValues }
      : null;

  const conditions = commissionSqlConditions({
    programId,
    startDate,
    endDate,
    status,
    partnerFilter,
    typeFilter,
    groupIdParam: groupId,
  });

  const whereClause = Prisma.join(conditions, " AND ");

  const rows = await prisma.$queryRaw<CommissionGroupIdQueryRow[]>(
    Prisma.sql`
      SELECT
        pe.groupId AS groupId,
        SUM(c.earnings) AS earnings,
        COUNT(c.id) AS count
      FROM Commission c
      JOIN ProgramEnrollment pe
        ON pe.programId = c.programId
       AND pe.partnerId = c.partnerId
      WHERE ${whereClause}
      GROUP BY pe.groupId
      ORDER BY earnings DESC`,
  );

  const groupIds = rows
    .map((r) => r.groupId)
    .filter((id): id is string => id !== null);

  const partnerGroups =
    groupIds.length > 0
      ? await prisma.partnerGroup.findMany({
          where: { id: { in: groupIds } },
          select: { id: true, name: true },
        })
      : [];

  const partnerGroupById = new Map(partnerGroups.map((g) => [g.id, g]));

  const result = rows.map((row) => {
    const key = row.groupId ?? "ungrouped";
    const label =
      row.groupId === null
        ? "Ungrouped"
        : partnerGroupById.get(row.groupId)?.name ?? row.groupId;

    return {
      key,
      label,
      earnings: Number(row.earnings),
      count: Number(row.count),
    };
  });

  return NextResponse.json(commissionAnalyticsSchema.groupId.parse(result));
}

async function byPartnerId({
  programId,
  parsed,
  startDate,
  endDate,
}: {
  programId: string;
  parsed: CommissionAnalyticsQuery;
  startDate: Date;
  endDate: Date;
}) {
  const { status, partnerId, groupId, type } = parsed;
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
    return NextResponse.json(commissionAnalyticsSchema.partnerId.parse([]));
  }

  const typeFilter =
    rawTypeFilter && validTypeValues.length > 0
      ? { ...rawTypeFilter, values: validTypeValues }
      : null;

  const grouped = await prisma.commission.groupBy({
    by: ["partnerId"],
    where: {
      programId,
      createdAt: { gte: startDate, lt: endDate },
      status: status ? status : { notIn: [...excludedStatuses] },
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
    },
    _sum: { earnings: true },
    _count: { _all: true },
    orderBy: { _sum: { earnings: "desc" } },
  });

  if (grouped.length === 0) {
    return NextResponse.json(commissionAnalyticsSchema.partnerId.parse([]));
  }

  const partnerIds = grouped.map((g) => g.partnerId);

  const partners = await prisma.partner.findMany({
    where: { id: { in: partnerIds } },
    select: { id: true, name: true, image: true, country: true },
  });

  const partnerMap = new Map(partners.map((p) => [p.id, p]));

  const result = grouped.flatMap((g) => {
    const partner = partnerMap.get(g.partnerId);
    if (!partner) return [];

    return [
      {
        partnerId: g.partnerId,
        name: partner.name,
        image: partner.image ?? null,
        country: partner.country ?? null,
        earnings: g._sum.earnings ?? 0,
        commissionCount: g._count._all,
      },
    ];
  });

  return NextResponse.json(commissionAnalyticsSchema.partnerId.parse(result));
}

async function byTimeseries({
  workspace,
  programId,
  parsed,
}: {
  workspace: { id: string };
  programId: string;
  parsed: z.infer<typeof commissionAnalyticsQuerySchema>;
}) {
  const { start, end, interval, timezone, status, partnerId, groupId, type } =
    parsed;

  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
    dataAvailableFrom:
      interval === "all"
        ? await getProgramOrThrow({
            workspaceId: workspace.id,
            programId,
          }).then((program) => program.startedAt ?? program.createdAt)
        : undefined,
    timezone,
  });

  const { dateFormat, dateIncrement, startFunction, formatString } =
    sqlGranularityMap[granularity];

  const partnerFilter = parseFilterValue(partnerId);
  const typeFilter = parseFilterValue(type);

  const conditions = commissionSqlConditions({
    programId,
    startDate,
    endDate,
    status,
    partnerFilter,
    typeFilter,
    groupIdParam: groupId,
  });

  const whereClause = Prisma.join(conditions, " AND ");

  const rows = await prisma.$queryRaw<CommissionTimeseriesRow[]>(
    Prisma.sql`
      SELECT
        DATE_FORMAT(CONVERT_TZ(c.createdAt, "UTC", ${timezone || "UTC"}), ${dateFormat}) AS start,
        SUM(c.earnings) AS earnings,
        COUNT(c.id) AS count
      FROM Commission c
      WHERE ${whereClause}
      GROUP BY start
      ORDER BY start ASC`,
  );

  const earningsLookup = Object.fromEntries(
    rows.map((item) => [
      item.start,
      { earnings: Number(item.earnings), count: Number(item.count) },
    ]),
  );

  let currentDate = startFunction(startDate);

  const timeseries: z.infer<(typeof commissionAnalyticsSchema)["timeseries"]> =
    [];

  while (currentDate < endDate) {
    const periodKey = format(currentDate, formatString);

    timeseries.push({
      start: currentDate.toISOString(),
      ...(earningsLookup[periodKey] ?? { earnings: 0, count: 0 }),
    });

    currentDate = dateIncrement(currentDate);
  }

  return NextResponse.json(
    commissionAnalyticsSchema.timeseries.parse(timeseries),
  );
}
