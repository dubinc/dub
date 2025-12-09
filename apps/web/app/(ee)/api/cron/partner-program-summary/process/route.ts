import { getAnalytics } from "@/lib/analytics/get-analytics";
import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { sendBatchEmail } from "@dub/email";
import PartnerProgramSummary from "@dub/email/templates/partner-program-summary";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const PARTNER_BATCH_SIZE = 100;

const queue = qstash.queue({
  queueName: "partner-program-summary",
});

const schema = z.object({
  programId: z.string(),
  startingAfter: z.string().nullish(),
  batchNumber: z.number().nullish(),
});

interface AnalyticsResponse {
  partnerId: string;
  clicks: number;
  leads: number;
  sales: number;
  saleAmount: number;
}

// POST /api/cron/partner-program-summary/process
export const POST = withCron(async ({ rawBody }) => {
  const result = schema.parse(JSON.parse(rawBody));

  let { programId, startingAfter, batchNumber } = result;

  const previousMonth = startOfMonth(subMonths(new Date(), 2));
  const currentMonth = startOfMonth(subMonths(new Date(), 1));

  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
    select: {
      id: true,
      name: true,
      logo: true,
      slug: true,
      supportEmail: true,
      workspaceId: true,
    },
  });

  if (!program) {
    return logAndRespond(`Program ${programId} not found.`);
  }

  console.info(`Sending program summary for ${program.slug}`, {
    previousMonth,
    currentMonth,
  });

  // Find the clicks, leads, sales analytics
  const [previousMonthAnalytics, currentMonthAnalytics] = await Promise.all([
    // 2 months ago
    getAnalytics({
      event: "composite",
      groupBy: "top_partners",
      workspaceId: program.workspaceId,
      programId: program.id,
      start: previousMonth,
      end: endOfMonth(previousMonth),
    }),

    // 1 month ago
    getAnalytics({
      event: "composite",
      groupBy: "top_partners",
      workspaceId: program.workspaceId,
      programId: program.id,
      start: currentMonth,
      end: endOfMonth(currentMonth),
    }),
  ]);

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId: program.id,
      status: "approved",
      partner: {
        users: {
          some: {},
        },
      },
      links: {
        some: {
          leads: {
            gt: 0,
          },
        },
      },
    },
    select: {
      id: true,
      partner: {
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      },
      links: {
        select: {
          clicks: true,
          leads: true,
          sales: true,
        },
      },
    },
    ...(startingAfter && {
      skip: 1,
      cursor: {
        id: startingAfter,
      },
    }),
    orderBy: {
      id: "desc",
    },
    take: PARTNER_BATCH_SIZE,
  });

  console.info(
    `Found ${programEnrollments.length} active partners that have signed up for partners.dub.co and have links with at least 1 total lead.`,
  );

  if (programEnrollments.length === 0) {
    return logAndRespond(
      `No more active partners found for program ${program.id}.`,
    );
  }

  // Find the earnings
  const partners = programEnrollments.map(({ partner }) => partner);

  const commissionWhere: Prisma.CommissionWhereInput = {
    earnings: {
      gt: 0,
    },
    programId: program.id,
    partnerId: {
      in: partners.map((partner) => partner.id),
    },
    status: {
      in: ["pending", "processed", "paid"],
    },
  };

  const [previousMonthEarnings, currentMonthEarnings, lifetimeEarnings] =
    await Promise.all([
      // Earnings 2 months ago (to compare with previous month)
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

      // Earnings 1 month ago,
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

      // All-time earnings
      prisma.commission.groupBy({
        by: ["partnerId"],
        where: {
          ...commissionWhere,
        },
        _sum: {
          earnings: true,
        },
      }),
    ]);

  const previousEarningsMap = new Map(
    previousMonthEarnings.map((e) => [e.partnerId, e]),
  );

  const currentEarningsMap = new Map(
    currentMonthEarnings.map((e) => [e.partnerId, e]),
  );

  const lifetimeEarningsMap = new Map(
    lifetimeEarnings.map((e) => [e.partnerId, e]),
  );

  const previousAnalyticsMap: Map<string, AnalyticsResponse> = new Map(
    previousMonthAnalytics.map((a: AnalyticsResponse) => [a.partnerId, a]),
  );

  const currentAnalyticsMap: Map<string, AnalyticsResponse> = new Map(
    currentMonthAnalytics.map((a: AnalyticsResponse) => [a.partnerId, a]),
  );

  const summary = partners.map((partner) => {
    // Get previous and current month analytics from Tinybird
    const _previousMonthAnalytics = previousAnalyticsMap.get(partner.id);
    const _currentMonthAnalytics = currentAnalyticsMap.get(partner.id);

    // Get lifetime analytics from MySQL
    const _lifetimeAnalytics = programEnrollments
      .find((enrollment) => enrollment.partner.id === partner.id)
      ?.links.reduce(
        (acc, link) => ({
          clicks: acc.clicks + link.clicks,
          leads: acc.leads + link.leads,
          sales: acc.sales + link.sales,
        }),
        { clicks: 0, leads: 0, sales: 0 },
      );

    // Get earnings data from MySQL
    const _previousMonthEarnings = previousEarningsMap.get(partner.id);
    const _currentMonthEarnings = currentEarningsMap.get(partner.id);
    const _lifetimeEarnings = lifetimeEarningsMap.get(partner.id);

    return {
      partner,
      previousMonth: {
        clicks: _previousMonthAnalytics?.clicks ?? 0,
        leads: _previousMonthAnalytics?.leads ?? 0,
        sales: _previousMonthAnalytics?.sales ?? 0,
        earnings: _previousMonthEarnings?._sum.earnings ?? 0,
      },
      currentMonth: {
        clicks: _currentMonthAnalytics?.clicks ?? 0,
        leads: _currentMonthAnalytics?.leads ?? 0,
        sales: _currentMonthAnalytics?.sales ?? 0,
        earnings: _currentMonthEarnings?._sum.earnings ?? 0,
      },
      lifetime: {
        clicks: _lifetimeAnalytics?.clicks ?? 0,
        leads: _lifetimeAnalytics?.leads ?? 0,
        sales: _lifetimeAnalytics?.sales ?? 0,
        earnings: _lifetimeEarnings?._sum.earnings ?? 0,
      },
    };
  });

  console.table(
    summary.map((s) => ({
      partner: s.partner.email,
      program: program.name,
      currentClicks: s.currentMonth.clicks,
      currentLeads: s.currentMonth.leads,
      currentSales: s.currentMonth.sales,
      currentEarnings: s.currentMonth.earnings,
      lifetimeClicks: s.lifetime.clicks,
      lifetimeLeads: s.lifetime.leads,
      lifetimeSales: s.lifetime.sales,
      lifetimeEarnings: s.lifetime.earnings,
    })),
  );

  const reportingMonth = format(currentMonth, "MMM yyyy");
  batchNumber = batchNumber || 1;

  await sendBatchEmail(
    summary.map(({ partner, ...rest }) => ({
      variant: "notifications",
      subject: `Your ${reportingMonth} performance report for ${program.name} program`,
      to: partner.email!,
      replyTo: program.supportEmail || "noreply",
      react: PartnerProgramSummary({
        program,
        partner,
        ...rest,
        reportingPeriod: {
          month: reportingMonth,
          start: currentMonth.toISOString(),
          end: endOfMonth(currentMonth).toISOString(),
        },
      }),
    })),
    {
      idempotencyKey: `partner-program-summary-${reportingMonth}-${program.id}-${batchNumber}`,
    },
  );

  // Schedule the next batch if there are more partners to process
  if (programEnrollments.length === PARTNER_BATCH_SIZE) {
    startingAfter = programEnrollments[programEnrollments.length - 1].id;
    batchNumber++;

    const response = await queue.enqueueJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partner-program-summary/process`,
      method: "POST",
      body: {
        ...result,
        startingAfter,
        batchNumber,
      },
    });

    return logAndRespond(
      `Enqueued partner program summary jobs for the next batch ${response.messageId}`,
    );
  }

  return logAndRespond(
    `Finished processing all partners for program ${program.id}.`,
  );
});
