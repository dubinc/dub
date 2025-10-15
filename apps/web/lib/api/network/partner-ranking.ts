import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { ACME_PROGRAM_ID } from "@dub/utils";

export interface PartnerRankingFilters {
  partnerIds?: string[];
  status?: "discover" | "invited" | "recruited";
  country?: string;
  starred?: boolean;
}

export interface PartnerRankingParams extends PartnerRankingFilters {
  programId: string;
  page: number;
  pageSize: number;
  similarPrograms?: Array<{ programId: string; similarityScore: number }>;
}

/**
 * Enhanced Partner Ranking Algorithm
 * Additive scoring model prioritizing similarity matching over raw performance.
 *
 * Scoring Breakdown (0-100 points):
 *
 * 1. Base Score (0-35 points): Current program performance
 *    - Consistency: 10 points
 *    - Conversion Rate: 5 points
 *    - Lifetime Value: 10 points
 *    - Commissions: 10 points
 *
 * 2. Similarity Score (0-50 points): Performance in similar programs
 *    - Sums weighted performance across similar programs (similarityScore > 0.3)
 *    - Each program's performance weighted by its similarity score
 *    - Partners with more similar programs score higher (capped at 50)
 *
 * 3. Program Match Score (0-15 points): Count of similar programs
 *    - Rewards partners enrolled in many similar programs
 *    - 2 points per similar program (capped at 15)
 *
 * Final Score = Base + Similarity + Match (0-100 points)
 */
export async function calculatePartnerRanking({
  programId,
  partnerIds,
  country,
  starred,
  page,
  pageSize,
  status = "discover",
  similarPrograms = [],
}: PartnerRankingParams) {
  const conditions: Prisma.Sql[] = [
    // Removed discoverableAt requirement to show all partners
    Prisma.sql`(dp.ignoredAt IS NULL OR dp.id IS NULL)`, // Allow partners not yet discovered
    Prisma.sql`COALESCE(pe.conversionRate, 0) < 1`,
  ];

  if (partnerIds && partnerIds.length > 0) {
    conditions.push(Prisma.sql`p.id IN (${Prisma.join(partnerIds)})`);
  }

  if (country) {
    conditions.push(Prisma.sql`p.country = ${country}`);
  }

  if (status === "discover") {
    conditions.push(Prisma.sql`enrolled.id IS NULL`);
  } else if (status === "invited") {
    conditions.push(
      Prisma.sql`enrolled.status = 'invited' AND dp.invitedAt IS NOT NULL`,
    );
  } else if (status === "recruited") {
    conditions.push(
      Prisma.sql`enrolled.status = 'approved' AND dp.invitedAt IS NOT NULL`,
    );
  }

  if (starred === true) {
    conditions.push(Prisma.sql`dp.starredAt IS NOT NULL`);
  } else if (starred === false) {
    conditions.push(Prisma.sql`(dp.starredAt IS NULL OR dp.id IS NULL)`);
  }

  const whereClause = Prisma.join(conditions, " AND ");

  const orderByClause =
    starred === true
      ? Prisma.sql`dp.starredAt DESC, finalScore DESC, p.id ASC`
      : Prisma.sql`finalScore DESC, p.id ASC`;

  const offset = (page - 1) * pageSize;

  const partners = await prisma.$queryRaw<Array<any>>`
    SELECT 
      p.*,
      COALESCE(pe.lastConversionAt, similarProgramMetrics.lastConversionAt) as lastConversionAt,
      COALESCE(pe.conversionRate, similarProgramMetrics.avgConversionRate) as conversionRate,
      dp.starredAt,
      dp.ignoredAt,
      dp.invitedAt,
      CASE WHEN enrolled.status = 'approved' THEN enrolled.createdAt ELSE NULL END as recruitedAt,
      partnerCategories.categories as categories,
      
      -- FINAL SCORE (0-100 points): Additive model for ranking
      (
        -- Base score (0-35): Current program performance
        (
          (COALESCE(pe.consistencyScore, 50) / 100 * 10) +
          (CASE 
            WHEN COALESCE(pe.conversionRate, 0) <= 0 THEN 0
            WHEN COALESCE(pe.conversionRate, 0) >= 0.1 THEN 5
            ELSE (SQRT(LOG10(COALESCE(pe.conversionRate, 0) * 1000 + 1)) * 40 / 100) * 5
          END) +
          (CASE 
            WHEN COALESCE(pe.averageLifetimeValue, 0) <= 0 THEN 0
            WHEN COALESCE(pe.averageLifetimeValue, 0) >= 10000 THEN 10
            ELSE (LOG10(COALESCE(pe.averageLifetimeValue, 0) + 1) * 25 / 100) * 10
          END) +
          (CASE 
            WHEN COALESCE(pe.totalCommissions, 0) <= 0 THEN 0
            WHEN COALESCE(pe.totalCommissions, 0) >= 100000 THEN 10
            ELSE (LOG10(COALESCE(pe.totalCommissions, 0) + 1) * 22 / 100) * 10
          END)
        ) +
        
        -- Similarity score (0-50): Performance in similar programs
        COALESCE(similarProgramMetrics.similarityScore, 0) +
        
        -- Program match score (0-15): Count of similar programs
        COALESCE(similarProgramMetrics.programMatchScore, 0)
      ) as finalScore
    FROM Partner p
   
    -- Current program enrollment (if exists)
    LEFT JOIN ProgramEnrollment pe ON pe.partnerId = p.id AND pe.programId = ${programId}
   
    -- Enrollment status for the current program
    LEFT JOIN ProgramEnrollment enrolled ON enrolled.partnerId = p.id AND enrolled.programId = ${programId}
   
    -- Discovered partner metadata
    LEFT JOIN DiscoveredPartner dp ON dp.partnerId = p.id AND dp.programId = ${programId}

    ${
      similarPrograms.length > 0
        ? Prisma.sql`LEFT JOIN (
      SELECT 
        pe2.partnerId,
        -- Similarity score: Sum weighted performance (0-50 points, no averaging)
        LEAST(50, SUM(
          (
            -- Individual program performance score (0-1 range per program)
            (COALESCE(pe2.consistencyScore, 50) / 100 * 0.20) +
            (CASE 
              WHEN COALESCE(pe2.conversionRate, 0) <= 0 THEN 0
              WHEN COALESCE(pe2.conversionRate, 0) >= 0.1 THEN 0.10
              ELSE (SQRT(LOG10(COALESCE(pe2.conversionRate, 0) * 1000 + 1)) * 40 / 100) * 0.10
            END) +
            (CASE 
              WHEN COALESCE(pe2.averageLifetimeValue, 0) <= 0 THEN 0
              WHEN COALESCE(pe2.averageLifetimeValue, 0) >= 10000 THEN 0.15
              ELSE (LOG10(COALESCE(pe2.averageLifetimeValue, 0) + 1) * 25 / 100) * 0.15
            END) +
            (CASE 
              WHEN COALESCE(pe2.totalCommissions, 0) <= 0 THEN 0
              WHEN COALESCE(pe2.totalCommissions, 0) >= 100000 THEN 0.05
              ELSE (LOG10(COALESCE(pe2.totalCommissions, 0) + 1) * 22 / 100) * 0.05
            END)
          ) * (CASE pe2.programId
            ${Prisma.join(
              similarPrograms.map(
                (sp) =>
                  Prisma.sql`WHEN ${sp.programId} THEN ${sp.similarityScore}`,
              ),
              " ",
            )}
            ELSE 0 END) * 50 -- Weight by similarity, scale to 0-50 range
        )) as similarityScore,
        -- Program match score: Count of similar programs (0-15 points)
        LEAST(15, COUNT(DISTINCT pe2.programId) * 2) as programMatchScore,
        -- Aggregate metrics for display purposes
        MAX(pe2.lastConversionAt) as lastConversionAt,
        SUM(COALESCE(pe2.conversionRate, 0) * (CASE pe2.programId
          ${Prisma.join(
            similarPrograms.map(
              (sp) =>
                Prisma.sql`WHEN ${sp.programId} THEN ${sp.similarityScore}`,
            ),
            " ",
          )}
          ELSE 0 END)) / NULLIF(SUM(CASE pe2.programId
          ${Prisma.join(
            similarPrograms.map(
              (sp) =>
                Prisma.sql`WHEN ${sp.programId} THEN ${sp.similarityScore}`,
            ),
            " ",
          )}
          ELSE 0 END), 0) as avgConversionRate
      FROM ProgramEnrollment pe2
      WHERE pe2.programId IN (${Prisma.join(similarPrograms.map((sp) => sp.programId))})
        AND pe2.status = 'approved'
        AND pe2.totalConversions > 0
        AND pe2.programId != ${ACME_PROGRAM_ID}
      GROUP BY pe2.partnerId
    ) similarProgramMetrics ON similarProgramMetrics.partnerId = p.id`
        : Prisma.sql`LEFT JOIN (SELECT NULL as partnerId, NULL as similarityScore, NULL as programMatchScore, NULL as lastConversionAt, NULL as avgConversionRate WHERE FALSE) similarProgramMetrics ON similarProgramMetrics.partnerId = p.id`
    }

    -- Get all categories from programs the partner is enrolled in
    LEFT JOIN (
      SELECT 
        pe5.partnerId,
        GROUP_CONCAT(DISTINCT pc.category ORDER BY pc.category SEPARATOR ',') as categories
      FROM ProgramEnrollment pe5
      JOIN ProgramCategory pc ON pc.programId = pe5.programId
      WHERE pe5.status = 'approved'
      GROUP BY pe5.partnerId
    ) partnerCategories ON partnerCategories.partnerId = p.id

    WHERE ${whereClause}
    ORDER BY ${orderByClause}
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  return partners;
}
