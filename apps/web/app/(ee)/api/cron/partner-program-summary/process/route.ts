import { getAnalytics } from "@/lib/analytics/get-analytics";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash/redis";
import { chunk } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { endOfMonth } from "date-fns";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";
import {
  getPartnerProgramSummaryKeys,
  getReportingPeriod,
  monthHasNoActivity,
  PARTNER_PROGRAM_SUMMARY_TTL_SECONDS,
  PartnerProgramSummaryStats,
  yearMonthSchema,
} from "../utils";

export const dynamic = "force-dynamic";

// Number of partner IDs per enrollment lookup
const ENROLLMENT_CHUNK_SIZE = 1000;

// Number of partners written per Redis pipeline
const REDIS_CHUNK_SIZE = 250;

const schema = z.object({
  programId: z.string(),
  yearMonth: yearMonthSchema,
});

interface AnalyticsResponse {
  partnerId: string;
  clicks: number;
  leads: number;
  sales: number;
  saleAmount: number;
}

// This route computes the monthly stats of every eligible partner in a program
// and stages them in Redis (keyed by partner) so that /send can build one email per partner.
// Called by the main route once for each program.
// POST /api/cron/partner-program-summary/process
export const POST = withCron(async ({ rawBody }) => {
  const { programId, yearMonth } = schema.parse(JSON.parse(rawBody));

  const { previousMonth, currentMonth } = getReportingPeriod(yearMonth);

  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
    select: {
      id: true,
      slug: true,
      workspaceId: true,
      deactivatedAt: true,
    },
  });

  if (!program) {
    return logAndRespond(`Program ${programId} not found.`);
  }

  if (program.deactivatedAt) {
    return logAndRespond(`Program ${program.slug} is deactivated. Skipping...`);
  }

  console.info(
    `Computing partner program summaries for ${program.slug} (${yearMonth})`,
    {
      previousMonth,
      currentMonth,
    },
  );

  const commissionWhere: Prisma.CommissionWhereInput = {
    programId: program.id,
    earnings: {
      gt: 0,
    },
    status: {
      in: ["pending", "processed", "paid"],
    },
  };

  const [
    previousMonthAnalytics,
    currentMonthAnalytics,
    previousMonthEarnings,
    currentMonthEarnings,
  ] = await Promise.all([
    // Clicks, leads and sales from Tinybird – 2 months ago
    getAnalytics({
      event: "composite",
      groupBy: "top_partners",
      workspaceId: program.workspaceId,
      programId: program.id,
      start: previousMonth,
      end: endOfMonth(previousMonth),
    }),

    // Clicks, leads and sales from Tinybird – 1 month ago
    getAnalytics({
      event: "composite",
      groupBy: "top_partners",
      workspaceId: program.workspaceId,
      programId: program.id,
      start: currentMonth,
      end: endOfMonth(currentMonth),
    }),

    // Earnings from MySQL – 2 months ago
    prisma.commission.groupBy({
      by: ["partnerId"],
      where: {
        ...commissionWhere,
        createdAt: {
          gte: previousMonth,
          lte: endOfMonth(previousMonth),
        },
      },
      _sum: {
        earnings: true,
      },
    }),

    // Earnings from MySQL – 1 month ago
    prisma.commission.groupBy({
      by: ["partnerId"],
      where: {
        ...commissionWhere,
        createdAt: {
          gte: currentMonth,
          lte: endOfMonth(currentMonth),
        },
      },
      _sum: {
        earnings: true,
      },
    }),
  ]);

  const previousAnalyticsMap = new Map<string, AnalyticsResponse>(
    previousMonthAnalytics.map((a: AnalyticsResponse) => [a.partnerId, a]),
  );

  const currentAnalyticsMap = new Map<string, AnalyticsResponse>(
    currentMonthAnalytics.map((a: AnalyticsResponse) => [a.partnerId, a]),
  );

  const previousEarningsMap = new Map(
    previousMonthEarnings.map((e) => [e.partnerId, e._sum.earnings ?? 0]),
  );

  const currentEarningsMap = new Map(
    currentMonthEarnings.map((e) => [e.partnerId, e._sum.earnings ?? 0]),
  );

  // Every partner that had some activity in the program during either month
  const activePartnerIds = [
    ...new Set([
      ...previousAnalyticsMap.keys(),
      ...currentAnalyticsMap.keys(),
      ...previousEarningsMap.keys(),
      ...currentEarningsMap.keys(),
    ]),
  ];

  if (activePartnerIds.length === 0) {
    return logAndRespond(
      `No partner activity found for program ${program.slug} in ${yearMonth}. Skipping...`,
    );
  }

  // Only partners that are actively enrolled in the program and have at least 1 lead get a summary
  const eligiblePartnerIds: string[] = [];

  for (const partnerIdsChunk of chunk(
    activePartnerIds,
    ENROLLMENT_CHUNK_SIZE,
  )) {
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        programId: program.id,
        status: "approved",
        totalLeads: {
          gt: 0,
        },
        partnerId: {
          in: partnerIdsChunk,
        },
      },
      select: {
        partnerId: true,
      },
    });

    eligiblePartnerIds.push(...programEnrollments.map((e) => e.partnerId));
  }

  const summaries = eligiblePartnerIds
    .map((partnerId) => {
      const _previousMonthAnalytics = previousAnalyticsMap.get(partnerId);
      const _currentMonthAnalytics = currentAnalyticsMap.get(partnerId);

      const stats: PartnerProgramSummaryStats = {
        previousMonth: {
          earnings: previousEarningsMap.get(partnerId) ?? 0,
          clicks: _previousMonthAnalytics?.clicks ?? 0,
          leads: _previousMonthAnalytics?.leads ?? 0,
          sales: _previousMonthAnalytics?.sales ?? 0,
        },
        currentMonth: {
          earnings: currentEarningsMap.get(partnerId) ?? 0,
          clicks: _currentMonthAnalytics?.clicks ?? 0,
          leads: _currentMonthAnalytics?.leads ?? 0,
          sales: _currentMonthAnalytics?.sales ?? 0,
        },
      };

      return { partnerId, stats };
    })
    .filter(
      ({ stats }) =>
        !(
          monthHasNoActivity(stats.previousMonth) &&
          monthHasNoActivity(stats.currentMonth)
        ),
    );

  console.info(
    `Found ${summaries.length} active partners with at least 1 lead out of ${activePartnerIds.length} partners with activity in program ${program.slug}.`,
  );

  if (summaries.length === 0) {
    return logAndRespond(
      `No eligible partners found for program ${program.slug} in ${yearMonth}. Skipping...`,
    );
  }

  const keys = getPartnerProgramSummaryKeys(yearMonth);

  for (const summariesChunk of chunk(summaries, REDIS_CHUNK_SIZE)) {
    const pipeline = redis.pipeline();

    for (const { partnerId, stats } of summariesChunk) {
      const partnerKey = keys.partner(partnerId);

      pipeline.hset(partnerKey, { [program.id]: stats });
      pipeline.expire(partnerKey, PARTNER_PROGRAM_SUMMARY_TTL_SECONDS);
    }

    const [firstMember, ...otherMembers] = summariesChunk.map(
      ({ partnerId }) => ({ score: 0, member: partnerId }),
    );

    pipeline.zadd(keys.partners, firstMember, ...otherMembers);
    pipeline.expire(keys.partners, PARTNER_PROGRAM_SUMMARY_TTL_SECONDS);

    await pipeline.exec();
  }

  return logAndRespond(
    `Staged partner program summaries for ${summaries.length} partners in program ${program.slug} for ${yearMonth}.`,
  );
});
