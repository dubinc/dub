import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { prisma } from "@dub/prisma";
import { PartnerProgramPerformance } from "@dub/prisma/client";
import { ACME_PROGRAM_ID, APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { differenceInDays } from "date-fns";
import { z } from "zod";
import { logAndRespond } from "../utils";
export const dynamic = "force-dynamic";

interface QueryResult {
  partnerId: string;
  programId: string;
  totalClicks: number;
  totalLeads: number;
  totalConversions: number;
  totalSales: number;
  totalSaleAmount: number;
  lastConversionAt: Date | null;
}

const payloadSchema = z.object({
  startingAfter: z.string(),
});

const BATCH_SIZE = 100;

async function handler(req: Request) {
  try {
    let startingAfter: string | undefined;

    // First run
    if (req.method === "GET") {
      await verifyVercelSignature(req);
    }

    // Subsequent runs
    else if (req.method === "POST") {
      const rawBody = await req.text();

      await verifyQstashSignature({
        req,
        rawBody,
      });

      const payload = payloadSchema.parse(JSON.parse(rawBody));
      startingAfter = payload.startingAfter;
    }

    // Find the program enrollments to process based on the startingAfter cursor
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        programId: {
          not: ACME_PROGRAM_ID,
        },
        status: {
          in: ["approved", "invited"],
        },
        links: {
          some: {},
        },
      },
      include: {
        links: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: BATCH_SIZE,
      skip: startingAfter ? 1 : 0,
      ...(startingAfter && {
        cursor: {
          id: startingAfter,
        },
      }),
    });

    if (programEnrollments.length === 0) {
      return logAndRespond("No more program enrollments to process.");
    }

    // Calculate the partner performances
    const partnerPerformances: Omit<
      PartnerProgramPerformance,
      "id" | "createdAt" | "updatedAt"
    >[] = [];

    for (const programEnrollment of programEnrollments) {
      const {
        totalClicks,
        totalConversions,
        totalSaleAmount,
        totalLeads,
        totalSales,
      } = aggregatePartnerLinksStats(programEnrollment.links);

      const conversionRate =
        totalClicks > 0 ? totalConversions / totalClicks : 0;

      const averageLifetimeValue =
        totalConversions > 0 ? totalSaleAmount / totalConversions : 0;

      const leadConversionRate =
        totalLeads > 0 ? totalConversions / totalLeads : 0;

      // Find the last conversion date and the days since the last conversion
      const lastConversionDates = programEnrollment.links
        .map((link) => link.lastConversionAt)
        .filter((date): date is Date => date !== null);

      const lastConversionAt =
        lastConversionDates.length > 0
          ? new Date(
              Math.max(...lastConversionDates.map((date) => date.getTime())),
            )
          : null;

      const daysSinceLastConversion = lastConversionAt
        ? differenceInDays(new Date(), lastConversionAt)
        : null;

      // Wilson Score
      const wilsonScore =
        totalClicks > 0
          ? (conversionRate +
              (1.96 * 1.96) / (2 * totalClicks) -
              1.96 *
                Math.sqrt(
                  (conversionRate * (1 - conversionRate) +
                    (1.96 * 1.96) / (4 * totalClicks)) /
                    totalClicks,
                )) /
            (1 + (1.96 * 1.96) / totalClicks)
          : 0;

      // Performance score (0-100)
      const sampleSizeMultiplier = Math.min(1.0, totalClicks / 50.0);
      const performanceScore = Math.max(
        0,
        wilsonScore * sampleSizeMultiplier * 100,
      );

      // Consistency score based on conversion timing
      let consistencyScore = 50;
      if (lastConversionAt && daysSinceLastConversion !== null) {
        // Higher consistency score for more recent conversions
        if (daysSinceLastConversion <= 7) {
          consistencyScore = 100;
        } else if (daysSinceLastConversion <= 30) {
          consistencyScore = 85;
        } else if (daysSinceLastConversion <= 90) {
          consistencyScore = 70;
        } else if (daysSinceLastConversion <= 180) {
          consistencyScore = 55;
        } else {
          consistencyScore = 40;
        }
      }

      partnerPerformances.push({
        partnerId: programEnrollment.partnerId,
        programId: programEnrollment.programId,
        totalClicks,
        totalLeads,
        totalConversions,
        totalSales,
        totalSaleAmount,
        lastConversionAt,
        daysSinceLastConversion,
        lastCalculatedAt: new Date(),
        conversionRate: Number(conversionRate.toFixed(4)),
        averageLifetimeValue: Number(averageLifetimeValue.toFixed(4)),
        leadConversionRate: Number(leadConversionRate.toFixed(4)),
        performanceScore: Number(performanceScore.toFixed(4)),
        consistencyScore,
      });
    }

    await prisma.partnerProgramPerformance.createMany({
      data: partnerPerformances,
      skipDuplicates: true,
    });

    await prisma.partnerProgramPerformance.deleteMany({
      where: {
        partnerId: {
          in: partnerPerformances.map((p) => p.partnerId),
        },
        programId: {
          in: partnerPerformances.map((p) => p.programId),
        },
      },
    });

    await prisma.partnerProgramPerformance.createMany({
      data: partnerPerformances,
      skipDuplicates: true,
    });

    if (programEnrollments.length === BATCH_SIZE) {
      startingAfter = programEnrollments[programEnrollments.length - 1].id;

      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/calculate-partner-program-performances`,
        method: "POST",
        body: {
          startingAfter,
        },
      });
    }

    return logAndRespond("Finished calculating partner program performances.");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}

export { handler as GET, handler as POST };
