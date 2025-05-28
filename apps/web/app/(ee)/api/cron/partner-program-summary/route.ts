import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { limiter } from "@/lib/cron/limiter";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { sendEmail } from "@dub/email";
import { PartnerProgramSummary } from "@dub/email/templates/partner-program-summary";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, log } from "@dub/utils";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { NextResponse } from "next/server";

/*
  This route is used to send program reports to partners.
  Runs once every month on the 1st day
*/

export const dynamic = "force-dynamic";

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
      },
      select: {
        partner: {
          select: {
            id: true,
            email: true,
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

    // TODO
    // Find analytics

    const previousMonth = subMonths(new Date(), 1);

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

    if (earningsLifetime.length === 0) {
      console.log(`No commissions found for program ${program.id}.`);
      return NextResponse.json(
        `No commissions found for program ${program.id}.`,
      );
    }

    const stats = partners.map((partner) => {
      const earningsMonthly = earningsPreviousMonth.find(
        (commission) => commission.partnerId === partner.id,
      );

      const earningsTotal = earningsLifetime.find(
        (commission) => commission.partnerId === partner.id,
      );

      return {
        partner,
        earningsPreviousMonth: earningsMonthly?._sum.earnings ?? 0,
        earningsLifetime: earningsTotal?._sum.earnings ?? 0,
      };
    });

    if (stats.length === 0) {
      console.log(`No stats found for program ${program.id}.`);
      return NextResponse.json(`No stats found for program ${program.id}.`);
    }

    console.log(stats);
    return;

    await Promise.allSettled(
      stats.map(({ partner, earningsPreviousMonth, earningsLifetime }) => {
        limiter.schedule(() =>
          sendEmail({
            subject: `${program.name} partner program summary`,
            email: partner.email!,
            react: PartnerProgramSummary({
              program,
              partner,
              currentMonth: {
                clicks: 0,
                leads: 0,
                sales: 0,
                earnings: earningsPreviousMonth,
              },
              lifetime: {
                clicks: 0,
                leads: 0,
                sales: 0,
                earnings: earningsLifetime,
              },
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
