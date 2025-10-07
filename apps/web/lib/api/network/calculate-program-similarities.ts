import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID } from "@dub/utils";

interface ProgramSimilarityData {
  programId: string;
  similarProgramId: string;
  categoryOverlapScore: number;
  partnerOverlapScore: number;
  performancePatternScore: number;
  combinedSimilarityScore: number;
  sharedPartnerCount: number;
  sharedCategoryCount: number;
}

// Calculate similarity scores between all programs
// This should be run periodically to update similarity data
export async function calculateProgramSimilarities() {
  const programs = await prisma.program.findMany({
    where: {
      id: {
        not: ACME_PROGRAM_ID,
      },
      categories: {
        some: {},
      },
    },
    include: {
      categories: true,
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

      // 1. Category Overlap Score (0-1)
      const program1Categories = new Set(
        program1.categories.map((ii) => ii.category),
      );

      const program2Categories = new Set(
        program2.categories.map((ii) => ii.category),
      );

      const sharedCategories = new Set(
        [...program1Categories].filter((x) => program2Categories.has(x)),
      );

      const totalUniqueCategories = new Set([
        ...program1Categories,
        ...program2Categories,
      ]);

      const categoryOverlapScore =
        totalUniqueCategories.size > 0
          ? sharedCategories.size / totalUniqueCategories.size
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
        categoryOverlapScore * 0.4 + // Category overlap is most important
        partnerOverlapScore * 0.35 + // Partner overlap is second most important
        performancePatternScore * 0.25; // Performance patterns are supporting evidence

      // Only store meaningful similarities (threshold of 0.1)
      if (combinedSimilarityScore >= 0.1) {
        similarities.push({
          programId: program1.id,
          similarProgramId: program2.id,
          categoryOverlapScore,
          partnerOverlapScore,
          performancePatternScore,
          combinedSimilarityScore,
          sharedPartnerCount: sharedCount,
          sharedCategoryCount: sharedCategories.size,
        });

        // Add reverse relationship
        similarities.push({
          programId: program2.id,
          similarProgramId: program1.id,
          categoryOverlapScore,
          partnerOverlapScore,
          performancePatternScore,
          combinedSimilarityScore,
          sharedPartnerCount: sharedCount,
          sharedCategoryCount: sharedCategories.size,
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
