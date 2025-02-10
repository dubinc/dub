import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { getPartnerAnalyticsSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { format } from "date-fns";
import { NextResponse } from "next/server";

// TODO:
// Limit the event to clicks and composite for now
// Consider timezone for Prisma query
// Test timezone

// GET /api/partners/analytics – get analytics for a partner
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const {
    groupBy,
    event,
    programId,
    partnerId,
    tenantId,
    interval,
    start,
    end,
    timezone,
  } = getPartnerAnalyticsSchema.parse(searchParams);

  if (!programId) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "Program ID not found. Did you forget to include a `programId` query parameter?",
    });
  }

  if (!partnerId && !tenantId) {
    throw new DubApiError({
      code: "bad_request",
      message: "You must provide a partnerId or tenantId.",
    });
  }

  const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
    where: partnerId
      ? {
          partnerId_programId: {
            partnerId,
            programId,
          },
        }
      : {
          tenantId_programId: {
            tenantId: tenantId!,
            programId,
          },
        },
    include: {
      program: true,
    },
  });

  if (programEnrollment.program.workspaceId !== workspace.id) {
    throw new DubApiError({
      code: "not_found",
      message: "Program not found.",
    });
  }

  const analytics = await getAnalytics({
    programId,
    partnerId,
    tenantId,
    groupBy,
    event,
    interval,
    start,
    end,
    timezone,
  });

  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
  });

  if (groupBy === "count") {
    const revenue = await prisma.commission.aggregate({
      where: {
        programId: programEnrollment.programId,
        partnerId: programEnrollment.partnerId,
        type: "sale",
        status: {
          notIn: ["duplicate", "fraud", "refunded"],
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return NextResponse.json({
      ...analytics,
      revenue: revenue._sum.amount,
    });
  }

  const { dateFormat } = sqlGranularityMap[granularity];

  const revenue = await prisma.$queryRaw<{ start: string; amount: number }[]>`
    SELECT 
      DATE_FORMAT(CONVERT_TZ(createdAt, '+00:00', ${timezone || "+00:00"}),  ${dateFormat}) AS start, 
      SUM(amount) AS amount
    FROM Commission
    WHERE 
      createdAt >= ${startDate}
      AND createdAt < ${endDate}
      AND programId = ${programEnrollment.programId}
      AND partnerId = ${programEnrollment.partnerId}
    GROUP BY start
    ORDER BY start ASC;
  `;

  const revenueLookup = Object.fromEntries(
    revenue.map((item) => [
      format(item.start, "yyyy-MM-dd'T'HH:mm"),
      {
        amount: item.amount,
      },
    ]),
  );

  const analyticsWithRevenue = analytics.map((item) => {
    const formattedDateTime = format(
      new Date(item.start),
      "yyyy-MM-dd'T'HH:00",
    );

    return {
      ...item,
      revenue: revenueLookup[formattedDateTime]?.amount ?? 0,
    };
  });

  return NextResponse.json(analyticsWithRevenue);
});
