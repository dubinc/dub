import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID } from "@dub/utils";

// Calculate and store partner performance scores for each program enrollment
export async function calculatePartnerProgramPerformances() {
  console.log("Starting partner program performance calculation...");

  // Get all partner-program combinations with meaningful activity
  const partnerPrograms = await prisma.$queryRaw<
    Array<{
      partnerId: string;
      programId: string;
      totalClicks: number;
      totalLeads: number;
      totalConversions: number;
      totalSales: number;
      totalSaleAmount: number;
      lastConversionAt: Date | null;
    }>
  >`
    SELECT 
      l.partnerId,
      l.programId,
      SUM(l.clicks) as totalClicks,
      SUM(l.leads) as totalLeads,
      SUM(l.conversions) as totalConversions,
      SUM(l.sales) as totalSales,
      SUM(l.saleAmount) as totalSaleAmount,
      MAX(l.lastConversionAt) as lastConversionAt
    FROM Link l
    WHERE l.programId IS NOT NULL 
    AND l.programId != ${ACME_PROGRAM_ID}
    AND l.partnerId IS NOT NULL
    AND l.clicks > 0 -- Only partners with some activity
    GROUP BY l.partnerId, l.programId
    HAVING totalClicks >= 10 -- Minimum threshold for meaningful analysis
  `;

  console.log(
    `Found ${partnerPrograms.length} partner-program relationships to analyze`,
  );

  console.log(partnerPrograms)

  const performances = partnerPrograms.map((pp) => {
    const conversionRate =
      pp.totalClicks > 0 ? pp.totalConversions / pp.totalClicks : 0;
    const averageLifetimeValue =
      pp.totalConversions > 0 ? pp.totalSaleAmount / pp.totalConversions : 0;
    const leadConversionRate =
      pp.totalLeads > 0 ? pp.totalConversions / pp.totalLeads : 0;

    // Calculate Wilson Score for this specific program
    const wilsonScore =
      pp.totalClicks > 0
        ? (conversionRate +
            (1.96 * 1.96) / (2 * pp.totalClicks) -
            1.96 *
              Math.sqrt(
                (conversionRate * (1 - conversionRate) +
                  (1.96 * 1.96) / (4 * pp.totalClicks)) /
                  pp.totalClicks,
              )) /
          (1 + (1.96 * 1.96) / pp.totalClicks)
        : 0;

    // Performance score (0-100)
    const sampleSizeMultiplier = Math.min(1.0, pp.totalClicks / 50.0);
    const performanceScore = Math.max(
      0,
      wilsonScore * sampleSizeMultiplier * 100,
    );

    // Consistency score based on conversion timing
    let consistencyScore = 50; // Default middle score
    if (pp.lastConversionAt) {
      const daysSinceLastConversion = Math.floor(
        (Date.now() - pp.lastConversionAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Higher consistency score for more recent conversions
      if (daysSinceLastConversion <= 7) consistencyScore = 100;
      else if (daysSinceLastConversion <= 30) consistencyScore = 85;
      else if (daysSinceLastConversion <= 90) consistencyScore = 70;
      else if (daysSinceLastConversion <= 180) consistencyScore = 55;
      else consistencyScore = 40;
    }

    const daysSinceLastConversion = pp.lastConversionAt
      ? Math.floor(
          (Date.now() - pp.lastConversionAt.getTime()) / (1000 * 60 * 60 * 24),
        )
      : null;

    return {
      partnerId: pp.partnerId,
      programId: pp.programId,
      totalClicks: pp.totalClicks,
      totalLeads: pp.totalLeads,
      totalConversions: pp.totalConversions,
      totalSales: pp.totalSales,
      totalSaleAmount: pp.totalSaleAmount,
      conversionRate,
      averageLifetimeValue,
      leadConversionRate,
      lastConversionAt: pp.lastConversionAt,
      daysSinceLastConversion,
      performanceScore,
      consistencyScore,
      lastCalculatedAt: new Date(),
    };
  });

  // Clear existing performance data and insert new calculations
  await prisma.partnerProgramPerformance.deleteMany({});

  if (performances.length > 0) {
    await prisma.partnerProgramPerformance.createMany({
      data: performances,
    });
  }

  console.log(
    `Calculated performance scores for ${performances.length} partner-program relationships`,
  );
}
