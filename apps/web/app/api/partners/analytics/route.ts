import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import { getPartnerAnalyticsSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { format } from "date-fns";
import { NextResponse } from "next/server";

const eventMap = {
  clicks: "click",
  leads: "lead",
  sales: "sale",
} as const;

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
    const earnings = await prisma.commission.aggregate({
      _sum: {
        earnings: true,
      },
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
        programId: programEnrollment.programId,
        partnerId: programEnrollment.partnerId,
        ...(event !== "composite" && { type: eventMap[event] }),
      },
    });

    return NextResponse.json({
      ...analytics,
      earnings: earnings._sum.earnings || 0,
    });
  }

  const { dateFormat } = sqlGranularityMap[granularity];

  const revenue = await prisma.$queryRaw<{ start: string; earnings: number }[]>`
    SELECT 
      DATE_FORMAT(CONVERT_TZ(createdAt, '+00:00', ${timezone || "+00:00"}),  ${dateFormat}) AS start, 
      SUM(earnings) AS earnings
    FROM Commission
    WHERE 
      createdAt >= ${startDate}
      AND createdAt < ${endDate}
      AND programId = ${programEnrollment.programId}
      AND partnerId = ${programEnrollment.partnerId}
      ${event !== "composite" ? Prisma.sql`AND type = ${eventMap[event]}` : Prisma.sql``}
    GROUP BY start
    ORDER BY start ASC;`;

  const revenueLookup = Object.fromEntries(
    revenue.map((item) => [
      format(
        new Date(item.start),
        granularity === "hour" ? "yyyy-MM-dd'T'HH:00" : "yyyy-MM-dd'T'00:00",
      ),
      {
        earnings: item.earnings,
      },
    ]),
  );

  console.log({
    revenue,
    revenueLookup,
  });

  const analyticsWithRevenue = analytics.map((item) => {
    const formattedDateTime = format(
      new Date(item.start),
      granularity === "hour" ? "yyyy-MM-dd'T'HH:00" : "yyyy-MM-dd'T'00:00",
    );

    return {
      ...item,
      earnings: revenueLookup[formattedDateTime]?.earnings ?? 0,
    };
  });

  return NextResponse.json(analyticsWithRevenue);
});
