import { prisma } from "@dub/prisma";

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

// Calculate similarity scores for a specific program against a list of target programs
export async function calculateSimilarityForProgram(programId: string) {
  const sourceProgram = await prisma.program.findUniqueOrThrow({
    where: {
      id: programId,
    },
    include: {
      categories: true,
    },
  });

  const targetPrograms = await prisma.program.findMany({
    where: {
      id: {
        gt: programId,
      },
      categories: {
        some: {},
      },
    },
    include: {
      categories: true,
    },
  });

  if (targetPrograms.length === 0) {
    return [];
  }

  const similarities: ProgramSimilarityData[] = [];

  // Calculate similarities with each target program
  for (const targetProgram of targetPrograms) {
    // 1. Category Overlap Score (0-1)
    const sourceProgramCategories = new Set(
      sourceProgram.categories.map((c) => c.category),
    );

    const targetProgramCategories = new Set(
      targetProgram.categories.map((c) => c.category),
    );

    const sharedCategories = new Set(
      [...sourceProgramCategories].filter((x) =>
        targetProgramCategories.has(x),
      ),
    );

    const totalUniqueCategories = new Set([
      ...sourceProgramCategories,
      ...targetProgramCategories,
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
        (SELECT COUNT(DISTINCT partnerId) FROM Link WHERE programId = ${sourceProgram.id} AND conversions > 0) as total1,
        (SELECT COUNT(DISTINCT partnerId) FROM Link WHERE programId = ${targetProgram.id} AND conversions > 0) as total2
      FROM Link p1
      INNER JOIN Link p2 ON p1.partnerId = p2.partnerId
      WHERE p1.programId = ${sourceProgram.id} 
      AND p2.programId = ${targetProgram.id}
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
        COALESCE(AVG(CASE WHEN l.programId = ${sourceProgram.id} THEN l.conversions / NULLIF(l.clicks, 0) END), 0) as program1_avg_conversion_rate,
        COALESCE(AVG(CASE WHEN l.programId = ${sourceProgram.id} THEN l.saleAmount / NULLIF(l.conversions, 0) END), 0) as program1_avg_aov,
        COALESCE(AVG(CASE WHEN l.programId = ${targetProgram.id} THEN l.conversions / NULLIF(l.clicks, 0) END), 0) as program2_avg_conversion_rate,
        COALESCE(AVG(CASE WHEN l.programId = ${targetProgram.id} THEN l.saleAmount / NULLIF(l.conversions, 0) END), 0) as program2_avg_aov
      FROM Link l
      WHERE l.programId IN (${sourceProgram.id}, ${targetProgram.id})
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
        programId: sourceProgram.id,
        similarProgramId: targetProgram.id,
        categoryOverlapScore,
        partnerOverlapScore,
        performancePatternScore,
        combinedSimilarityScore,
        sharedPartnerCount: sharedCount,
        sharedCategoryCount: sharedCategories.size,
      });

      // Add reverse relationship for fast bidirectional queries
      similarities.push({
        programId: targetProgram.id,
        similarProgramId: sourceProgram.id,
        categoryOverlapScore,
        partnerOverlapScore,
        performancePatternScore,
        combinedSimilarityScore,
        sharedPartnerCount: sharedCount,
        sharedCategoryCount: sharedCategories.size,
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    // Delete all existing similarities where this program appears (both directions)
    await tx.programSimilarity.deleteMany({
      where: {
        OR: [{ programId: programId }, { similarProgramId: programId }],
      },
    });

    if (similarities.length > 0) {
      await tx.programSimilarity.createMany({
        data: similarities,
        skipDuplicates: true,
      });
    }
  });

  console.log(
    `Stored ${similarities.length} similarities for program ${sourceProgram.name}`,
  );

  return similarities;
}
