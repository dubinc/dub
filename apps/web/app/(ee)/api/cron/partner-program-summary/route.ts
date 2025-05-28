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
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { NextResponse } from "next/server";

/*
  This route is used to send program reports to partners.
  Runs once every month on the 1st day
*/

export const dynamic = "force-dynamic";

// GET/POST /api/cron/partner-program-summary
async function handler(req: Request) {
  try {
    if (req.method === "GET") {
      await verifyVercelSignature(req);
    } else if (req.method === "POST") {
      await verifyQstashSignature({
        req,
        rawBody: await req.text(),
      });
    }

    const programs = await prisma.program.findMany({
      take: 1, // TODO: Fix this
      skip: 0, // TODO: Fix this
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
      console.log("No programs found.");
      return NextResponse.json("No programs found.");
    }

    const program = programs[0];

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
    });

    if (programEnrollments.length === 0) {
      console.info(`No active partners found for program ${program.id}.`);
      return NextResponse.json(
        `No active partners found for program ${program.id}.`,
      );
    }

    const partners = programEnrollments.map((enrollment) => enrollment.partner);
    const previousMonth = subMonths(new Date(), 1);

    // Find the clicks, leads, sales analytics
    const [analyticsPreviousMonth, analyticsLifetime] = await Promise.all([
      getAnalytics({
        event: "composite",
        groupBy: "partners",
        programId: program.id,
        start: startOfMonth(previousMonth),
        end: endOfMonth(previousMonth),
      }),

      getAnalytics({
        event: "composite",
        groupBy: "partners",
        programId: program.id,
      }),
    ]);

    // Find the earnings
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

    const [earningsPreviousMonth, earningsLifetime] = await Promise.all([
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

    let summary = partners
      .map((partner) => {
        const earningsMonthly = earningsPreviousMonth.find(
          (commission) => commission.partnerId === partner.id,
        );

        const earningsTotal = earningsLifetime.find(
          (commission) => commission.partnerId === partner.id,
        );

        const analyticsMonthly = analyticsPreviousMonth.find(
          (analytics) => analytics.partnerId === partner.id,
        );

        const analyticsTotal = analyticsLifetime.find(
          (analytics) => analytics.partnerId === partner.id,
        );

        return {
          partner,
          previousMonth: {
            clicks: analyticsMonthly?.clicks ?? 0,
            leads: analyticsMonthly?.leads ?? 0,
            sales: analyticsMonthly?.sales ?? 0,
            earnings: earningsMonthly?._sum.earnings ?? 0,
          },
          lifetime: {
            clicks: analyticsTotal?.clicks ?? 0,
            leads: analyticsTotal?.leads ?? 0,
            sales: analyticsTotal?.sales ?? 0,
            earnings: earningsTotal?._sum.earnings ?? 0,
          },
        };
      })
      .filter(({ lifetime }) => lifetime.leads > 0);

    await Promise.allSettled(
      summary.map(({ partner, previousMonth, lifetime }) => {
        limiter.schedule(() =>
          sendEmail({
            subject: `${program.name} partner program summary`,
            email: partner.email!,
            react: PartnerProgramSummary({
              program,
              partner,
              previousMonth,
              lifetime,
            }),
          }),
        );
      }),
    );

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partner-program-summary`,
      method: "POST",
      body: {},
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
