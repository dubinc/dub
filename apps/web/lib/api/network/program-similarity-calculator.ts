import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID } from "@dub/utils";

interface ProgramSimilarityData {
  programId: string;
  similarProgramId: string;
  industryOverlapScore: number;
  partnerOverlapScore: number;
  performancePatternScore: number;
  combinedSimilarityScore: number;
  sharedPartnerCount: number;
  sharedIndustryCount: number;
}

/**
 * Calculate similarity scores between all programs
 * This should be run periodically (e.g., daily) to update similarity data
 */
export async function calculateProgramSimilarities(): Promise<void> {
  console.log("Starting program similarity calculation...");

  // Get all programs with their industry interests
  const programs = await prisma.program.findMany({
    where: {
      id: { not: ACME_PROGRAM_ID }, // Exclude test program
      industryInterests: {
        some: {},
      },
    },
    include: {
      industryInterests: true,
    },
  });

  console.log(`Found ${programs.length} programs to analyze`);

  const similarities: ProgramSimilarityData[] = [];

  // Compare each program with every other program
  for (let i = 0; i < programs.length; i++) {
    for (let j = i + 1; j < programs.length; j++) {
      const program1 = programs[i];
      const program2 = programs[j];

      console.log(
        `Calculating similarity between ${program1.name} and ${program2.name}`,
      );

      // 1. Industry Overlap Score (0-1)
      const program1Industries = new Set(
        program1.industryInterests.map((ii) => ii.industryInterest),
      );
      const program2Industries = new Set(
        program2.industryInterests.map((ii) => ii.industryInterest),
      );

      const sharedIndustries = new Set(
        [...program1Industries].filter((x) => program2Industries.has(x)),
      );
      const totalUniqueIndustries = new Set([
        ...program1Industries,
        ...program2Industries,
      ]);

      const industryOverlapScore =
        totalUniqueIndustries.size > 0
          ? sharedIndustries.size / totalUniqueIndustries.size
          : 0;

      // 2. Partner Overlap Score (0-1)
      const sharedPartnersData = await prisma.$queryRaw<
        Array<{ sharedCount: number; total1: number; total2: number }>
      >`
        SELECT 
          COUNT(DISTINCT p1.partnerId) as sharedCount,
          (SELECT COUNT(DISTINCT partnerId) FROM Link WHERE programId = ${program1.id} AND conversions > 0) as total1,
          (SELECT COUNT(DISTINCT partnerId) FROM Link WHERE programId = ${program2.id} AND conversions > 0) as total2
        FROM Link p1
        INNER JOIN Link p2 ON p1.partnerId = p2.partnerId
        WHERE p1.programId = ${program1.id} 
        AND p2.programId = ${program2.id}
        AND p1.conversions > 0 
        AND p2.conversions > 0
      `;

      const { sharedCount, total1, total2 } = sharedPartnersData[0];
      const totalUniquePartners = total1 + total2 - sharedCount;
      const partnerOverlapScore =
        totalUniquePartners > 0 ? sharedCount / totalUniquePartners : 0;

      // 3. Performance Pattern Score (0-1)
      const performanceData = await prisma.$queryRaw<
        Array<{
          program1_avg_conversion_rate: number;
          program1_avg_aov: number;
          program2_avg_conversion_rate: number;
          program2_avg_aov: number;
        }>
      >`
        SELECT 
          COALESCE(AVG(CASE WHEN l.programId = ${program1.id} THEN l.conversions / NULLIF(l.clicks, 0) END), 0) as program1_avg_conversion_rate,
          COALESCE(AVG(CASE WHEN l.programId = ${program1.id} THEN l.saleAmount / NULLIF(l.conversions, 0) END), 0) as program1_avg_aov,
          COALESCE(AVG(CASE WHEN l.programId = ${program2.id} THEN l.conversions / NULLIF(l.clicks, 0) END), 0) as program2_avg_conversion_rate,
          COALESCE(AVG(CASE WHEN l.programId = ${program2.id} THEN l.saleAmount / NULLIF(l.conversions, 0) END), 0) as program2_avg_aov
        FROM Link l
        WHERE l.programId IN (${program1.id}, ${program2.id})
        AND l.clicks > 10 -- Minimum threshold for meaningful data
        AND l.conversions > 0
      `;

      const perfData = performanceData[0];

      // Calculate similarity based on conversion rate and AOV patterns
      const conversionRateSimilarity =
        perfData.program1_avg_conversion_rate > 0 &&
        perfData.program2_avg_conversion_rate > 0
          ? 1 -
            Math.abs(
              perfData.program1_avg_conversion_rate -
                perfData.program2_avg_conversion_rate,
            ) /
              Math.max(
                perfData.program1_avg_conversion_rate,
                perfData.program2_avg_conversion_rate,
              )
          : 0;

      const aovSimilarity =
        perfData.program1_avg_aov > 0 && perfData.program2_avg_aov > 0
          ? 1 -
            Math.abs(perfData.program1_avg_aov - perfData.program2_avg_aov) /
              Math.max(perfData.program1_avg_aov, perfData.program2_avg_aov)
          : 0;

      const performancePatternScore =
        (conversionRateSimilarity + aovSimilarity) / 2;

      // 4. Combined Similarity Score (weighted average)
      const combinedSimilarityScore =
        industryOverlapScore * 0.4 + // Industry overlap is most important
        partnerOverlapScore * 0.35 + // Partner overlap is second most important
        performancePatternScore * 0.25; // Performance patterns are supporting evidence

      // Only store meaningful similarities (threshold of 0.1)
      if (combinedSimilarityScore >= 0.1) {
        similarities.push({
          programId: program1.id,
          similarProgramId: program2.id,
          industryOverlapScore,
          partnerOverlapScore,
          performancePatternScore,
          combinedSimilarityScore,
          sharedPartnerCount: sharedCount,
          sharedIndustryCount: sharedIndustries.size,
        });

        // Add reverse relationship
        similarities.push({
          programId: program2.id,
          similarProgramId: program1.id,
          industryOverlapScore,
          partnerOverlapScore,
          performancePatternScore,
          combinedSimilarityScore,
          sharedPartnerCount: sharedCount,
          sharedIndustryCount: sharedIndustries.size,
        });
      }
    }
  }

  console.log(`Calculated ${similarities.length} similarity relationships`);

  // Clear existing similarities and insert new ones
  await prisma.programSimilarity.deleteMany({});

  if (similarities.length > 0) {
    await prisma.programSimilarity.createMany({
      data: similarities,
    });
  }

  console.log("Program similarity calculation completed");
}

/**
 * Calculate and store partner performance scores for each program enrollment
 */
export async function calculatePartnerProgramPerformances(): Promise<void> {
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

/**
 * Get the top similar programs for a given program
 */
export async function getSimilarPrograms(
  programId: string,
  limit: number = 10,
) {
  return await prisma.programSimilarity.findMany({
    where: { programId },
    orderBy: { combinedSimilarityScore: "desc" },
    take: limit,
    include: {
      similarProgram: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          industryInterests: true,
        },
      },
    },
  });
}
