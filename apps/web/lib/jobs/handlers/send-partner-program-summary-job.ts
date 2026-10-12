import { getAnalytics } from "@/lib/analytics/get-analytics";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { yearMonthSchema } from "@/lib/zod/schemas/misc";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { tz } from "@date-fns/tz";
import { sendBatchEmail } from "@dub/email";
import PartnerProgramSummary from "@dub/email/templates/partner-program-summary";
import { chunk } from "@dub/utils";
import { CommissionStatus, Prisma, Program } from "@prisma/client";
import { endOfMonth, format, parse, subMonths } from "date-fns";
import * as z from "zod/v4";
import { defineJob } from "../index";

const MAX_PROGRAMS_PER_SUMMARY = 10;
const ANALYTICS_CACHE_TTL_SECONDS = 60 * 60; // 1 hour
const ANALYTICS_REQUEST_BATCH_SIZE = 10;

// earnings from MySQL, clicks, leads, sales from Tinybird
type MonthMetrics = {
  earnings: number;
  clicks: number;
  leads: number;
  sales: number;
};

type PartnerAnalyticsMetrics = {
  clicks: number;
  leads: number;
  sales: number;
};

const EMPTY_PARTNER_ANALYTICS: PartnerAnalyticsMetrics = {
  clicks: 0,
  leads: 0,
  sales: 0,
};

type ProgramSummaryStats = {
  previousMonth: MonthMetrics;
  currentMonth: MonthMetrics;
};

function monthHasNoActivity(m: MonthMetrics) {
  return m.earnings === 0 && m.clicks === 0 && m.leads === 0 && m.sales === 0;
}

function byCurrentMonthPerformance(
  a: ProgramSummaryStats,
  b: ProgramSummaryStats,
) {
  return (
    b.currentMonth.earnings - a.currentMonth.earnings ||
    b.currentMonth.sales - a.currentMonth.sales ||
    b.currentMonth.leads - a.currentMonth.leads ||
    b.currentMonth.clicks - a.currentMonth.clicks
  );
}

export function getReportingPeriod(yearMonth: string) {
  const utc = tz("UTC");
  const currentMonthStart = parse(yearMonth, "yyyy-MM", new Date(), {
    in: utc,
  });
  const previousMonthStart = subMonths(currentMonthStart, 1);
  const currentMonthEnd = endOfMonth(currentMonthStart);
  const previousMonthEnd = endOfMonth(previousMonthStart);

  const currentMonth = new Date(currentMonthStart.getTime());
  const previousMonth = new Date(previousMonthStart.getTime());
  const end = new Date(currentMonthEnd.getTime());

  return {
    currentMonth,
    previousMonth,
    previousMonthEnd: new Date(previousMonthEnd.getTime()),
    currentMonthEnd: end,
    month: format(currentMonthStart, "MMMM yyyy", { in: utc }),
    start: currentMonth.toISOString(),
    end: end.toISOString(),
  };
}

// Fetches composite top_partners for a program/month window once, caches the
// partnerId -> metrics map in Redis so other send jobs for the same program reuse it.
async function getTopPartnersAnalytics({
  workspaceId,
  programId,
  yearMonth,
  period,
  start,
  end,
}: {
  workspaceId: string;
  programId: string;
  yearMonth: string;
  period: "previous" | "current";
  start: Date;
  end: Date;
}): Promise<Record<string, PartnerAnalyticsMetrics>> {
  const cacheKey = `topPartnersAnalytics:${programId}:${yearMonth}:${period}`;

  const cached =
    await redis.get<Record<string, PartnerAnalyticsMetrics>>(cacheKey);

  if (cached) {
    return cached;
  }

  const rows = await getAnalytics({
    event: "composite",
    groupBy: "top_partners",
    workspaceId,
    programId,
    start,
    end,
  });

  const byPartnerId: Record<string, PartnerAnalyticsMetrics> = {};

  for (const row of rows) {
    byPartnerId[row.partnerId] = {
      clicks: row.clicks ?? 0,
      leads: row.leads ?? 0,
      sales: row.sales ?? 0,
    };
  }

  console.info(
    `[getProgramTopPartnersAnalytics] Cached ${Object.keys(byPartnerId).length} partners for ${programId} in ${yearMonth} ${period}`,
  );

  await redis.set(cacheKey, byPartnerId, {
    ex: ANALYTICS_CACHE_TTL_SECONDS,
  });

  return byPartnerId;
}

async function getPartnerAnalytics({
  enrollments,
  partnerId,
  yearMonth,
  previousMonth,
  previousMonthEnd,
  currentMonth,
  currentMonthEnd,
}: {
  enrollments: {
    program: Pick<Program, "id" | "name" | "logo" | "slug" | "workspaceId">;
  }[];
  partnerId: string;
  yearMonth: string;
} & Pick<
  ReturnType<typeof getReportingPeriod>,
  "previousMonth" | "previousMonthEnd" | "currentMonth" | "currentMonthEnd"
>) {
  const analyticsRequests = enrollments.flatMap(({ program }) => [
    {
      program,
      period: "previous" as const,
      start: previousMonth,
      end: previousMonthEnd,
    },
    {
      program,
      period: "current" as const,
      start: currentMonth,
      end: currentMonthEnd,
    },
  ]);

  const analyticsByKey = new Map<
    string,
    Record<string, PartnerAnalyticsMetrics>
  >();

  for (const batch of chunk(analyticsRequests, ANALYTICS_REQUEST_BATCH_SIZE)) {
    const batchResults = await Promise.all(
      batch.map(async ({ program, period, start, end }) => {
        const byPartner = await getTopPartnersAnalytics({
          workspaceId: program.workspaceId,
          programId: program.id,
          yearMonth,
          period,
          start,
          end,
        });

        return {
          key: `${program.id}:${period}`,
          byPartner,
        };
      }),
    );

    for (const { key, byPartner } of batchResults) {
      analyticsByKey.set(key, byPartner);
    }
  }

  return enrollments.map(({ program }) => ({
    program,
    previousMonthAnalytics:
      analyticsByKey.get(`${program.id}:previous`)?.[partnerId] ??
      EMPTY_PARTNER_ANALYTICS,
    currentMonthAnalytics:
      analyticsByKey.get(`${program.id}:current`)?.[partnerId] ??
      EMPTY_PARTNER_ANALYTICS,
  }));
}

const inputSchema = z.object({
  partnerId: z.string(),
  yearMonth: yearMonthSchema,
});

// Builds the monthly program summary for a partner (all programs combined)
// and sends it to each partner user with monthlyProgramSummary enabled.
// Skip if no users to notify or no program activity in the reporting window.
export const sendPartnerProgramSummaryJob = defineJob({
  name: "send-partner-program-summary-job",
  schema: inputSchema,
  async handle(input) {
    const { partnerId, yearMonth } = input;

    const partner = await prisma.partner.findUnique({
      where: {
        id: partnerId,
      },
      select: {
        users: {
          where: {
            notificationPreferences: {
              monthlyProgramSummary: true,
            },
          },
          select: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    const partnerUsersToNotify = (partner?.users ?? [])
      .map(({ user }) => user)
      .filter((user): user is { email: string } => Boolean(user?.email));

    if (partnerUsersToNotify.length === 0) {
      console.info(
        `[sendPartnerProgramSummaryJob] No partner emails to notify for partner ${partnerId}. Skipping...`,
      );
      return;
    }

    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        partnerId,
        program: {
          deactivatedAt: null,
        },
        status: {
          in: ACTIVE_ENROLLMENT_STATUSES,
        },
        totalLeads: {
          gt: 0,
        },
      },
      select: {
        program: {
          select: {
            id: true,
            name: true,
            logo: true,
            slug: true,
            workspaceId: true,
          },
        },
      },
    });

    if (enrollments.length === 0) {
      console.info(
        `[sendPartnerProgramSummaryJob] Partner ${partnerId} has no eligible enrollments. Skipping...`,
      );
      return;
    }

    const {
      previousMonth,
      previousMonthEnd,
      currentMonth,
      currentMonthEnd,
      month,
      start,
      end,
    } = getReportingPeriod(yearMonth);

    const programIds = enrollments.map((e) => e.program.id);

    const commissionWhere: Prisma.CommissionWhereInput = {
      partnerId,
      programId: {
        in: programIds,
      },
      earnings: {
        gt: 0,
      },
      status: {
        in: [
          CommissionStatus.pending,
          CommissionStatus.processed,
          CommissionStatus.paid,
        ],
      },
    };

    const [previousMonthEarnings, currentMonthEarnings, analyticsByProgram] =
      await Promise.all([
        prisma.commission.groupBy({
          by: ["programId"],
          where: {
            ...commissionWhere,
            createdAt: {
              gte: previousMonth,
              lte: previousMonthEnd,
            },
          },
          _sum: {
            earnings: true,
          },
        }),

        prisma.commission.groupBy({
          by: ["programId"],
          where: {
            ...commissionWhere,
            createdAt: {
              gte: currentMonth,
              lte: currentMonthEnd,
            },
          },
          _sum: {
            earnings: true,
          },
        }),

        getPartnerAnalytics({
          enrollments,
          partnerId,
          yearMonth,
          previousMonth,
          previousMonthEnd,
          currentMonth,
          currentMonthEnd,
        }),
      ]);

    const previousEarningsMap = new Map(
      previousMonthEarnings.map((e) => [e.programId, e._sum.earnings ?? 0]),
    );

    const currentEarningsMap = new Map(
      currentMonthEarnings.map((e) => [e.programId, e._sum.earnings ?? 0]),
    );

    const programs = analyticsByProgram
      .map(({ program, previousMonthAnalytics, currentMonthAnalytics }) => {
        const stats: ProgramSummaryStats = {
          previousMonth: {
            earnings: previousEarningsMap.get(program.id) ?? 0,
            clicks: previousMonthAnalytics.clicks ?? 0,
            leads: previousMonthAnalytics.leads ?? 0,
            sales: previousMonthAnalytics.sales ?? 0,
          },
          currentMonth: {
            earnings: currentEarningsMap.get(program.id) ?? 0,
            clicks: currentMonthAnalytics.clicks ?? 0,
            leads: currentMonthAnalytics.leads ?? 0,
            sales: currentMonthAnalytics.sales ?? 0,
          },
        };

        return {
          id: program.id,
          name: program.name,
          logo: program.logo,
          slug: program.slug,
          ...stats,
        };
      })
      .filter(
        (program) =>
          !(
            monthHasNoActivity(program.previousMonth) &&
            monthHasNoActivity(program.currentMonth)
          ),
      )
      .sort(byCurrentMonthPerformance)
      .slice(0, MAX_PROGRAMS_PER_SUMMARY);

    if (programs.length === 0) {
      console.info(
        `[sendPartnerProgramSummaryJob] Partner ${partnerId} has no program activity for ${yearMonth}. Skipping...`,
      );
      return;
    }

    console.table(
      programs.map((p) => {
        return {
          name: p.name,
          current: JSON.stringify(p.currentMonth),
          previous: JSON.stringify(p.previousMonth),
        };
      }),
    );

    const { error } = await sendBatchEmail(
      partnerUsersToNotify.map(({ email }) => ({
        variant: "notifications",
        subject: `Your ${month} partner program summary`,
        to: email,
        replyTo: "noreply",
        react: PartnerProgramSummary({
          email,
          programs,
          reportingPeriod: {
            month,
            start,
            end,
          },
        }),
      })),
      {
        idempotencyKey: `partner-program-summary-${yearMonth}-${partnerId}`,
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    console.info(
      `[sendPartnerProgramSummaryJob] Sent summary for partner ${partnerId} (${yearMonth}) to ${partnerUsersToNotify.length} users with ${programs.length} programs.`,
    );
  },
});
