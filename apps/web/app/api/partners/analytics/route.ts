import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { sqlGranularityMap } from "@/lib/planetscale/granularity";
import {
  partnerAnalyticsQuerySchema,
  partnersTopLinksSchema,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { format } from "date-fns";
import { NextResponse } from "next/server";

// GET /api/partners/analytics – get analytics for a partner
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const {
    groupBy,
    programId,
    partnerId,
    tenantId,
    interval = "all",
    start,
    end,
    timezone,
  } = partnerAnalyticsQuerySchema.parse(searchParams);

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
      ...(groupBy === "top_links" && {
        links: {
          orderBy: {
            clicks: "desc",
          },
        },
      }),
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
    interval,
    start,
    end,
    timezone,
    event: "composite",
  });

  const { startDate, endDate, granularity } = getStartEndDates({
    interval,
    start,
    end,
  });

  // Group by count
  if (groupBy === "count") {
    const earnings = await prisma.commission.aggregate({
      _sum: {
        earnings: true,
      },
      where: {
        programId: programEnrollment.programId,
        partnerId: programEnrollment.partnerId,
        type: "sale",
        status: {
          in: ["pending", "processed", "paid"],
        },
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    return NextResponse.json({
      ...analytics,
      earnings: earnings._sum.earnings || 0,
    });
  }

  const { dateFormat } = sqlGranularityMap[granularity];

  // Group by timeseries
  if (groupBy === "timeseries") {
    const earnings = await prisma.$queryRaw<
      { start: string; earnings: number }[]
    >`
    SELECT 
      DATE_FORMAT(CONVERT_TZ(createdAt, '+00:00', ${timezone || "+00:00"}),  ${dateFormat}) AS start, 
      SUM(earnings) AS earnings
    FROM Commission
    WHERE 
      programId = ${programEnrollment.programId}
      AND partnerId = ${programEnrollment.partnerId}
      AND type = 'sale'
      AND status in ('pending', 'processed', 'paid')
      AND createdAt >= ${startDate}
      AND createdAt < ${endDate}
    GROUP BY start
    ORDER BY start ASC;`;

    const earningsLookup = Object.fromEntries(
      earnings.map((item) => [
        format(
          new Date(item.start),
          granularity === "hour" ? "yyyy-MM-dd'T'HH:00" : "yyyy-MM-dd'T'00:00",
        ),
        {
          earnings: item.earnings,
        },
      ]),
    );

    const analyticsWithRevenue = analytics.map((item) => {
      const formattedDateTime = format(
        new Date(item.start),
        granularity === "hour" ? "yyyy-MM-dd'T'HH:00" : "yyyy-MM-dd'T'00:00",
      );

      return {
        ...item,
        earnings: Number(earningsLookup[formattedDateTime]?.earnings ?? 0),
      };
    });

    return NextResponse.json(analyticsWithRevenue);
  }

  // Group by top_links
  const topLinkEarnings = await prisma.commission.groupBy({
    by: ["linkId"],
    where: {
      programId: programEnrollment.programId,
      partnerId: programEnrollment.partnerId,
      type: "sale",
      status: {
        in: ["pending", "processed", "paid"],
      },
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
    },
    _sum: {
      earnings: true,
    },
  });

  const topLinksWithEarnings = programEnrollment.links.map((link) => {
    const analyticsData = analytics.find((a) => a.id === link.id);
    const earnings = topLinkEarnings.find((t) => t.linkId === link.id);

    return partnersTopLinksSchema.parse({
      ...link,
      ...analyticsData,
      link: link.id,
      createdAt: link.createdAt.toISOString(),
      earnings: Number(earnings?._sum.earnings ?? 0),
    });
  });

  return NextResponse.json(topLinksWithEarnings);
});
