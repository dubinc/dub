import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import {
  applicationEventAnalyticsQuerySchema,
  applicationEventAnalyticsSchema,
} from "@/lib/application-events/schema";
import { withWorkspace } from "@/lib/auth";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { ApplicationEventAnalyticsQuery } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { parseFilterValue } from "@dub/utils";
import { format } from "date-fns/format";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

type TimeseriesApplicationRow = {
  start: string;
  visits: bigint;
  starts: bigint;
  submissions: bigint;
  approvals: bigint;
  rejections: bigint;
};

type PartnerGroupApplicationRow = {
  groupId: string;
  visits: bigint;
  starts: bigint;
  submissions: bigint;
  approvals: bigint;
  rejections: bigint;
};

const aggregations = {
  _count: {
    visitedAt: true,
    startedAt: true,
    submittedAt: true,
    approvedAt: true,
    rejectedAt: true,
  },
} as const;

// GET /api/applications/analytics
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const parsedFilters =
    applicationEventAnalyticsQuerySchema.parse(searchParams);

  const {
    groupBy,
    groupId,
    partnerId,
    country,
    referralSource,
    start,
    end,
    interval,
    timezone,
  } = parsedFilters;

  if (groupBy !== "timeseries") {
    assertValidDateRangeForPlan({
      plan: workspace.plan,
      dataAvailableFrom: workspace.createdAt,
      interval,
      start,
      end,
    });
  }

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

  const partnerFilter = parseFilterValue(partnerId);
  const groupFilter = parseFilterValue(groupId);
  const countryFilter = parseFilterValue(country);
  const referralSourceFilter = parseFilterValue(referralSource);

  const where: Prisma.ProgramApplicationEventWhereInput = {
    programId,
    ...(partnerFilter && {
      referredByPartnerId:
        partnerFilter.sqlOperator === "NOT IN"
          ? { notIn: partnerFilter.values }
          : { in: partnerFilter.values },
    }),
    ...(groupFilter && {
      programEnrollment: {
        groupId:
          groupFilter.sqlOperator === "NOT IN"
            ? { notIn: groupFilter.values }
            : { in: groupFilter.values },
      },
    }),
    ...(countryFilter && {
      country:
        countryFilter.sqlOperator === "NOT IN"
          ? { notIn: countryFilter.values }
          : { in: countryFilter.values },
    }),
    ...(referralSourceFilter && {
      referralSource:
        referralSourceFilter.sqlOperator === "NOT IN"
          ? { notIn: referralSourceFilter.values }
          : { in: referralSourceFilter.values },
    }),
    visitedAt: {
      gte: startDate,
      lt: endDate,
    },
  };

  const responseSchema = applicationEventAnalyticsSchema[groupBy];

  // Get the absolute counts
  if (groupBy === "count") {
    const { _count } = await prisma.programApplicationEvent.aggregate({
      where,
      ...aggregations,
    });

    return NextResponse.json(responseSchema.parse(formatCounts(_count)));
  }

  // Get the counts grouped by the specified column
  if (["referralSource", "country"].includes(groupBy)) {
    const groupByColumnMap = {
      referralSource: "referralSource",
      country: "country",
    };

    const events = await prisma.programApplicationEvent.groupBy({
      by: [groupByColumnMap[groupBy]],
      where,
      ...aggregations,
      orderBy: {
        _count: {
          [groupBy]: "desc",
        },
      },
    });

    const results = events.map((row) => ({
      [groupBy]: row[groupByColumnMap[groupBy]],
      ...formatCounts(row._count),
    }));

    return NextResponse.json(z.array(responseSchema).parse(results));
  }

  // Get the counts grouped by the partner
  if (groupBy === "partner") {
    return byPartner({
      where,
    });
  }

  // Get the counts grouped by the partner group
  if (groupBy === "partnerGroup") {
    return byPartnerGroup({
      ...parsedFilters,
      programId,
    });
  }

  // Get the timeseries
  if (groupBy === "timeseries") {
    return byTimeseries({
      ...parsedFilters,
      programId,
    });
  }

  return NextResponse.json(null);
});

async function byPartner({
  where,
}: {
  where: Prisma.ProgramApplicationEventWhereInput;
}) {
  const events = await prisma.programApplicationEvent.groupBy({
    by: ["referredByPartnerId"],
    where,
    ...aggregations,
  });

  const partnerIds = events
    .map(({ referredByPartnerId }) => referredByPartnerId)
    .filter((id): id is string => Boolean(id));

  const partners =
    partnerIds.length > 0
      ? await prisma.partner.findMany({
          where: {
            id: {
              in: partnerIds,
            },
          },
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        })
      : [];

  const partnerById = new Map(partners.map((p) => [p.id, p]));

  const results = events.map((row) => ({
    partner: row.referredByPartnerId
      ? partnerById.get(row.referredByPartnerId) ?? null
      : null,
    ...formatCounts(row._count),
  }));

  return NextResponse.json(
    z.array(applicationEventAnalyticsSchema["partner"]).parse(results),
  );
}

async function byTimeseries({
  programId,
  groupId,
  partnerId,
  country,
  referralSource,
  timezone,
  interval,
  start,
  end,
}: ApplicationEventAnalyticsQuery & { programId: string }) {
  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

  const { dateFormat, dateIncrement, startFunction, formatString } =
    sqlGranularityMap[granularity];

  const partnerFilter = parseFilterValue(partnerId);
  const groupFilter = parseFilterValue(groupId);
  const countryFilter = parseFilterValue(country);
  const referralSourceFilter = parseFilterValue(referralSource);

  const conditions: Prisma.Sql[] = [
    Prisma.sql`e.programId = ${programId}`,
    Prisma.sql`e.visitedAt >= ${startDate}`,
    Prisma.sql`e.visitedAt < ${endDate}`,
  ];

  if (partnerFilter) {
    const list = Prisma.join(partnerFilter.values.map((v) => Prisma.sql`${v}`));
    conditions.push(
      partnerFilter.sqlOperator === "NOT IN"
        ? Prisma.sql`e.partnerId NOT IN (${list})`
        : Prisma.sql`e.partnerId IN (${list})`,
    );
  }

  if (groupFilter) {
    const list = Prisma.join(groupFilter.values.map((v) => Prisma.sql`${v}`));
    const op =
      groupFilter.sqlOperator === "NOT IN"
        ? Prisma.sql`NOT IN`
        : Prisma.sql`IN`;
    conditions.push(Prisma.sql`EXISTS (
        SELECT 1 FROM ProgramEnrollment pe
        WHERE pe.programId = e.programId
          AND pe.partnerId = e.partnerId
          AND pe.groupId ${op} (${list})
      )`);
  }

  if (countryFilter) {
    const list = Prisma.join(countryFilter.values.map((v) => Prisma.sql`${v}`));
    conditions.push(
      countryFilter.sqlOperator === "NOT IN"
        ? Prisma.sql`e.country NOT IN (${list})`
        : Prisma.sql`e.country IN (${list})`,
    );
  }

  if (referralSourceFilter) {
    const list = Prisma.join(
      referralSourceFilter.values.map((v) => Prisma.sql`${v}`),
    );
    conditions.push(
      referralSourceFilter.sqlOperator === "NOT IN"
        ? Prisma.sql`e.referralSource NOT IN (${list})`
        : Prisma.sql`e.referralSource IN (${list})`,
    );
  }

  const whereClause = Prisma.join(conditions, " AND ");

  const rows = await prisma.$queryRaw<TimeseriesApplicationRow[]>(
    Prisma.sql`
      SELECT
        DATE_FORMAT(CONVERT_TZ(e.visitedAt, "UTC", ${timezone || "UTC"}), ${dateFormat}) AS start,
        COUNT(e.visitedAt) AS visits,
        COUNT(e.startedAt) AS starts,
        COUNT(e.submittedAt) AS submissions,
        COUNT(e.approvedAt) AS approvals,
        COUNT(e.rejectedAt) AS rejections
      FROM ProgramApplicationEvent e
      WHERE ${whereClause}
      GROUP BY start
      ORDER BY start ASC`,
  );

  const lookup = Object.fromEntries(
    rows.map((r) => [
      r.start,
      {
        visits: Number(r.visits),
        starts: Number(r.starts),
        submissions: Number(r.submissions),
        approvals: Number(r.approvals),
        rejections: Number(r.rejections),
      },
    ]),
  );

  let currentDate = startFunction(startDate);
  const timeseries: z.infer<
    (typeof applicationEventAnalyticsSchema)["timeseries"]
  >[] = [];

  while (currentDate < endDate) {
    const periodKey = format(currentDate, formatString);

    timeseries.push({
      start: currentDate.toISOString(),
      ...(lookup[periodKey] ?? {
        visits: 0,
        starts: 0,
        submissions: 0,
        approvals: 0,
        rejections: 0,
      }),
    });

    currentDate = dateIncrement(currentDate);
  }

  return NextResponse.json(
    z.array(applicationEventAnalyticsSchema["timeseries"]).parse(timeseries),
  );
}

async function byPartnerGroup({
  programId,
  groupId,
  partnerId,
  country,
  referralSource,
  timezone,
  interval,
  start,
  end,
}: ApplicationEventAnalyticsQuery & { programId: string }) {
  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

  const partnerFilter = parseFilterValue(partnerId);
  const countryFilter = parseFilterValue(country);
  const referralSourceFilter = parseFilterValue(referralSource);
  const groupFilter = parseFilterValue(groupId);

  const conditions: Prisma.Sql[] = [
    Prisma.sql`e.programId = ${programId}`,
    Prisma.sql`e.visitedAt >= ${startDate}`,
    Prisma.sql`e.visitedAt < ${endDate}`,
    Prisma.sql`pe.groupId IS NOT NULL`,
  ];

  if (partnerFilter) {
    const list = Prisma.join(partnerFilter.values.map((v) => Prisma.sql`${v}`));
    conditions.push(
      partnerFilter.sqlOperator === "NOT IN"
        ? Prisma.sql`e.partnerId NOT IN (${list})`
        : Prisma.sql`e.partnerId IN (${list})`,
    );
  }

  if (countryFilter) {
    const list = Prisma.join(countryFilter.values.map((v) => Prisma.sql`${v}`));
    conditions.push(
      countryFilter.sqlOperator === "NOT IN"
        ? Prisma.sql`e.country NOT IN (${list})`
        : Prisma.sql`e.country IN (${list})`,
    );
  }

  if (referralSourceFilter) {
    const list = Prisma.join(
      referralSourceFilter.values.map((v) => Prisma.sql`${v}`),
    );
    conditions.push(
      referralSourceFilter.sqlOperator === "NOT IN"
        ? Prisma.sql`e.referralSource NOT IN (${list})`
        : Prisma.sql`e.referralSource IN (${list})`,
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

  const whereClause = Prisma.join(conditions, " AND ");

  const rows = await prisma.$queryRaw<PartnerGroupApplicationRow[]>(
    Prisma.sql`
      SELECT
        pe.groupId AS groupId,
        COUNT(e.visitedAt) AS visits,
        COUNT(e.startedAt) AS starts,
        COUNT(e.submittedAt) AS submissions,
        COUNT(e.approvedAt) AS approvals,
        COUNT(e.rejectedAt) AS rejections
      FROM ProgramApplicationEvent e
      JOIN ProgramEnrollment pe
        ON pe.programId = e.programId
       AND pe.partnerId = e.partnerId
      WHERE ${whereClause}
      GROUP BY pe.groupId`,
  );

  const groupIds = rows.map((row) => row.groupId);

  const partnerGroups =
    groupIds.length > 0
      ? await prisma.partnerGroup.findMany({
          where: {
            id: {
              in: groupIds,
            },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        })
      : [];

  const partnerGroupById = new Map(
    partnerGroups.map((group) => [group.id, group]),
  );

  const results = rows.flatMap((row) => {
    const partnerGroup = partnerGroupById.get(row.groupId);

    if (!partnerGroup) {
      return [];
    }

    return [
      {
        partnerGroup,
        visits: Number(row.visits),
        starts: Number(row.starts),
        submissions: Number(row.submissions),
        approvals: Number(row.approvals),
        rejections: Number(row.rejections),
      },
    ];
  });

  return NextResponse.json(
    z.array(applicationEventAnalyticsSchema["partnerGroup"]).parse(results),
  );
}

function formatCounts(c: {
  visitedAt: number;
  startedAt: number;
  submittedAt: number;
  approvedAt: number;
  rejectedAt: number;
}) {
  return {
    visits: c.visitedAt,
    starts: c.startedAt,
    submissions: c.submittedAt,
    approvals: c.approvedAt,
    rejections: c.rejectedAt,
  };
}
