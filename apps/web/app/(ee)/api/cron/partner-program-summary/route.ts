import { getAnalytics } from "@/lib/analytics/get-analytics";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { limiter } from "@/lib/cron/limiter";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { sendEmail } from "@dub/email";
import { PartnerProgramSummary } from "@dub/email/templates/partner-program-summary";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * This route handles the monthly partner program summary emails for partners.
 * Scheduled to run at 1 AM on the 1st day of every month to send the previous month's summary.
 *
 * 1. Processing Flow:
 *    - Processes one program at a time (paginated)
 *    - For each program, processes partners in batches of 1
 *    - Only processes approved partners with active leads
 *
 * 2. Data Collection:
 *    - Gathers analytics for three time periods:
 *      * Baseline month (2 months ago) - for comparison
 *      * Previous month (1 month ago) - current reporting period
 *      * Lifetime - all-time stats
 *    - Collects metrics: clicks, leads, sales, and earnings
 */

export const dynamic = "force-dynamic";

type AnalyticsResponse = {
  partnerId: string;
  clicks: number;
  leads: number;
  sales: number;
  saleAmount: number;
};

const schema = z.object({
  skip: z.number().optional().default(0),
});

// GET/POST /api/cron/partner-program-summary
async function handler(req: Request) {
  try {
    const programsTake = 1;
    let programSkip = 0;

    if (req.method === "GET") {
      await verifyVercelSignature(req);
    } else if (req.method === "POST") {
      const rawBody = await req.text();
      const result = schema.parse(JSON.parse(rawBody));
      programSkip = result.skip;

      await verifyQstashSignature({
        req,
        rawBody,
      });
    }

    const programs = await prisma.program.findMany({
      take: programsTake,
      skip: programSkip,
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        name: true,
        logo: true,
        slug: true,
      },
    });

    if (programs.length === 0) {
      console.log("No more programs found.");
      return NextResponse.json("No more programs found.");
    }

    // Since a program can have many partners, we process only one program at a time
    const program = programs[0];
    programSkip += programsTake;

    const comparisonMonth = subMonths(new Date(), 2);
    const previousMonth = subMonths(new Date(), 1);
    const reportingMonth = format(previousMonth, "MMMM");

    console.log(`Sending program summary for ${program.id}`, {
      comparisonMonth,
      previousMonth,
    });

    // Find the clicks, leads, sales analytics
    const [baselineMonthAnalytics, previousMonthAnalytics, lifetimeAnalytics] =
      await Promise.all([
        // 2 months ago
        getAnalytics({
          event: "composite",
          groupBy: "partnerId",
          programId: program.id,
          start: startOfMonth(comparisonMonth),
          end: endOfMonth(comparisonMonth),
        }),

        // 1 month ago
        getAnalytics({
          event: "composite",
          groupBy: "partnerId",
          programId: program.id,
          start: startOfMonth(previousMonth),
          end: endOfMonth(previousMonth),
        }),

        // Lifetime
        getAnalytics({
          event: "composite",
          groupBy: "partnerId",
          programId: program.id,
        }),
      ]);

    const partnersTake = 500;
    let partnersSkip = 0;

    // Process 500 partners at a time for a program
    while (true) {
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          programId: program.id,
          status: "approved",
          links: {
            some: {
              leads: {
                gt: 0,
              },
            },
          },
        },
        select: {
          partner: {
            select: {
              id: true,
              email: true,
              createdAt: true,
            },
          },
        },
        take: partnersTake,
        skip: partnersSkip,
        orderBy: {
          partner: {
            createdAt: "asc",
          },
        },
      });

      if (programEnrollments.length === 0) {
        console.log(`No more active partners found for program ${program.id}.`);
        break;
      }

      partnersSkip += partnersTake;

      // Find the earnings
      const partners = programEnrollments.map(
        (enrollment) => enrollment.partner,
      );

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

      const [baselineMonthEarnings, previousMonthEarnings, lifetimeEarnings] =
        await Promise.all([
          // Earnings 2 months ago (to compare with previous month)
          prisma.commission.groupBy({
            by: ["partnerId"],
            where: {
              ...commissionWhere,
              createdAt: {
                gte: startOfMonth(comparisonMonth),
                lte: endOfMonth(comparisonMonth),
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
                gte: startOfMonth(previousMonth),
                lte: endOfMonth(previousMonth),
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

      const baselineEarningsMap = new Map(
        baselineMonthEarnings.map((e) => [e.partnerId, e]),
      );

      const previousEarningsMap = new Map(
        previousMonthEarnings.map((e) => [e.partnerId, e]),
      );

      const lifetimeEarningsMap = new Map(
        lifetimeEarnings.map((e) => [e.partnerId, e]),
      );

      const baselineAnalyticsMap: Map<string, AnalyticsResponse> = new Map(
        baselineMonthAnalytics.map((a) => [a.partnerId, a]),
      );

      const previousAnalyticsMap: Map<string, AnalyticsResponse> = new Map(
        previousMonthAnalytics.map((a) => [a.partnerId, a]),
      );

      const lifetimeAnalyticsMap: Map<string, AnalyticsResponse> = new Map(
        lifetimeAnalytics.map((a) => [a.partnerId, a]),
      );

      let summary = partners
        .map((partner) => {
          const _baselineMonthEarnings = baselineEarningsMap.get(partner.id);
          const _previousMonthEarnings = previousEarningsMap.get(partner.id);
          const _lifetimeEarnings = lifetimeEarningsMap.get(partner.id);

          const _baselineMonthAnalytics = baselineAnalyticsMap.get(partner.id);
          const _previousMonthAnalytics = previousAnalyticsMap.get(partner.id);
          const _lifetimeAnalytics = lifetimeAnalyticsMap.get(partner.id);

          return {
            partner,
            comparisonMonth: {
              clicks: _baselineMonthAnalytics?.clicks ?? 0,
              leads: _baselineMonthAnalytics?.leads ?? 0,
              sales: _baselineMonthAnalytics?.sales ?? 0,
              earnings: _baselineMonthEarnings?._sum.earnings ?? 0,
            },
            previousMonth: {
              clicks: _previousMonthAnalytics?.clicks ?? 0,
              leads: _previousMonthAnalytics?.leads ?? 0,
              sales: _previousMonthAnalytics?.sales ?? 0,
              earnings: _previousMonthEarnings?._sum.earnings ?? 0,
            },
            lifetime: {
              clicks: _lifetimeAnalytics?.clicks ?? 0,
              leads: _lifetimeAnalytics?.leads ?? 0,
              sales: _lifetimeAnalytics?.sales ?? 0,
              earnings: _lifetimeEarnings?._sum.earnings ?? 0,
            },
          };
        })
        .filter(({ lifetime }) => lifetime.leads > 0);

      await Promise.allSettled(
        summary.map(({ partner, ...rest }) => {
          limiter.schedule(() =>
            sendEmail({
              subject: `Your ${reportingMonth} performance report for ${program.name} program`,
              email: partner.email!,
              react: PartnerProgramSummary({
                program,
                partner,
                ...rest,
                reportingMonth,
              }),
            }),
          );
        }),
      );
    }

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partner-program-summary`,
      method: "POST",
      body: {
        skip: programSkip,
      },
    });

    return NextResponse.json("Ok");
  } catch (error) {
    await log({
      message: `Error sending partner program summary: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}

export { handler as GET, handler as POST };
