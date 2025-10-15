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
 *    - Calculates weighted performance across top 10 similar programs
 *    - Each program's performance weighted by similarity score
 *
 * 3. Program Match Score (0-15 points): Count of similar programs
 *    - Rewards partners enrolled in many similar programs
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
}: PartnerRankingParams) {
  // Build WHERE clause conditions
  const conditions: Prisma.Sql[] = [
    Prisma.sql`p.discoverableAt IS NOT NULL`,
    Prisma.sql`dp.ignoredAt IS NULL`,
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
    conditions.push(Prisma.sql`dp.starredAt IS NULL`);
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
      pe.totalCommissions,
      COALESCE(pe.lastConversionAt, similarProgramMetrics.lastConversionAt) as lastConversionAt,
      COALESCE(pe.conversionRate, similarProgramMetrics.avgConversionRate) as conversionRate,
      pe.averageLifetimeValue,
      dp.starredAt,
      dp.ignoredAt,
      dp.invitedAt,
      CASE WHEN enrolled.status = 'approved' THEN enrolled.createdAt ELSE NULL END as recruitedAt,

      -- Individual metric scores for reference
      COALESCE(pe.consistencyScore, 50) as consistencyScore,
      CASE 
        WHEN COALESCE(pe.conversionRate, 0) <= 0 THEN 0
        WHEN COALESCE(pe.conversionRate, 0) >= 0.1 THEN 100
        ELSE LEAST(100, GREATEST(0, SQRT(LOG10(COALESCE(pe.conversionRate, 0) * 1000 + 1)) * 40))
      END as conversionRateScore,
      CASE 
        WHEN COALESCE(pe.averageLifetimeValue, 0) <= 0 THEN 0
        WHEN COALESCE(pe.averageLifetimeValue, 0) >= 10000 THEN 100
        ELSE LEAST(100, GREATEST(0, LOG10(COALESCE(pe.averageLifetimeValue, 0) + 1) * 25))
      END as lifetimeValueScore,
      CASE 
        WHEN COALESCE(pe.totalCommissions, 0) <= 0 THEN 0
        WHEN COALESCE(pe.totalCommissions, 0) >= 100000 THEN 100
        ELSE LEAST(100, GREATEST(0, LOG10(COALESCE(pe.totalCommissions, 0) + 1) * 22))
      END as commissionsScore,
      
      -- 1. BASE SCORE (0-35 points): Current program performance
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
      ) as baseScore,
      
      -- 2. SIMILARITY SCORE (0-50 points): Performance in similar programs
      COALESCE(similarProgramPerf.similarityScore, 0) as similarityScore,
      
      -- 3. PROGRAM MATCH SCORE (0-15 points): Count of similar programs
      COALESCE(programMatchPerf.programMatchScore, 0) as programMatchScore,
      
      -- FINAL SCORE (0-100 points): Additive model
      (
        -- Base score (0-35)
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
        
        -- Similarity score (0-50)
        COALESCE(similarProgramPerf.similarityScore, 0) +
        
        -- Program match score (0-15)
        COALESCE(programMatchPerf.programMatchScore, 0)
      ) as finalScore
    FROM Partner p
   
    -- Current program enrollment (if exists)
    LEFT JOIN ProgramEnrollment pe ON pe.partnerId = p.id AND pe.programId = ${programId}
   
    -- Enrollment status for the current program
    LEFT JOIN ProgramEnrollment enrolled ON enrolled.partnerId = p.id AND enrolled.programId = ${programId}
   
    -- Discovered partner metadata
    LEFT JOIN DiscoveredPartner dp ON dp.partnerId = p.id AND dp.programId = ${programId}
   
    -- 2. SIMILARITY SCORE: Performance in similar programs weighted by similarity
    LEFT JOIN (
      SELECT 
        pe2.partnerId,
        -- Calculate weighted performance across similar programs
        -- For each similar program, calculate score and weight by similarityScore
        SUM(
          (
            -- Individual program performance score (0-0.5 range)
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
          ) * ps.similarityScore -- Weight by program similarity
        ) / NULLIF(COUNT(*), 0) * 50 as similarityScore -- Normalize to 0-50 points
      FROM ProgramSimilarity ps

      JOIN ProgramEnrollment pe2 
        ON pe2.programId = ps.similarProgramId 
        AND pe2.status = 'approved'
        AND pe2.totalConversions > 0
        AND pe2.programId != ${ACME_PROGRAM_ID}
      WHERE ps.programId = ${programId}
        AND ps.similarityScore > 0.3
      GROUP BY pe2.partnerId
      HAVING COUNT(*) > 0
      ORDER BY similarityScore DESC
    ) similarProgramPerf ON similarProgramPerf.partnerId = p.id
    
    -- 3. PROGRAM MATCH SCORE: Count of similar programs
    LEFT JOIN (
      SELECT 
        pe3.partnerId,
        LEAST(15, COUNT(DISTINCT ps2.similarProgramId) * 2) as programMatchScore
      FROM ProgramSimilarity ps2
      JOIN ProgramEnrollment pe3 
        ON pe3.programId = ps2.similarProgramId 
        AND pe3.status = 'approved'
        AND pe3.programId != ${ACME_PROGRAM_ID}
      WHERE ps2.programId = ${programId}
        AND ps2.similarityScore > 0.3
      GROUP BY pe3.partnerId
    ) programMatchPerf ON programMatchPerf.partnerId = p.id

    -- AGGREGATE METRICS FROM SIMILAR PROGRAMS: For discovered partners
    LEFT JOIN (
      SELECT 
        pe4.partnerId,
        MAX(pe4.lastConversionAt) as lastConversionAt,
        -- Calculate weighted average conversion rate
        SUM(COALESCE(pe4.conversionRate, 0) * ps3.similarityScore) / NULLIF(SUM(ps3.similarityScore), 0) as avgConversionRate
      FROM ProgramSimilarity ps3
      JOIN ProgramEnrollment pe4 
        ON pe4.programId = ps3.similarProgramId 
        AND pe4.status = 'approved'
        AND pe4.totalConversions > 0
        AND pe4.programId != ${ACME_PROGRAM_ID}
      WHERE ps3.programId = ${programId}
        AND ps3.similarityScore > 0.3
      GROUP BY pe4.partnerId
    ) similarProgramMetrics ON similarProgramMetrics.partnerId = p.id

    WHERE ${whereClause}
    ORDER BY ${orderByClause}
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  console.log("top partners", partners[0], partners[1]);

  return partners;
}
