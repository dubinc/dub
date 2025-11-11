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
 * Partner Ranking Algorithm for Discovery
 * Ranks partners based on performance in similar programs only.
 *
 * Scoring Breakdown (0-65+ points):
 *
 * 1. Trusted Partner Bonus (200 points): Top priority boost
 *    - Partners with trustedAt IS NOT NULL get 200 bonus points
 *    - This ensures trusted partners appear at the very top
 *
 * 2. Similarity Score (0-50 points): Performance in similar programs
 *    - Sums weighted performance across similar programs (similarityScore > 0.3)
 *    - Each program's performance weighted by its similarity score
 *    - Partners with more similar programs score higher (capped at 50)
 *    - Includes: consistency (20%), conversion rate (10%), LTV (15%), commissions (5%)
 *
 * 3. Program Match Score (0-15 points): Count of similar programs
 *    - Rewards partners enrolled in many similar programs
 *    - 2 points per similar program (capped at 15)
 *
 * Final Score = Trusted Bonus + Similarity + Match (0-265+ points)
 *
 * Displayed Metrics:
 * - conversionRate: Average conversion rate across ALL programs the partner is enrolled in
 * - lastConversionAt: Most recent conversion date across ALL programs the partner is enrolled in
 *
 * Note: Ranking is primarily used for the "discover" tab. For "invited" and "recruited"
 * tabs, partners are sorted by date (most recent first).
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
    Prisma.sql`p.discoverableAt IS NOT NULL`,
    Prisma.sql`(dp.ignoredAt IS NULL OR dp.id IS NULL)`,
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

  // Rank partners with no online presence lower
  const hasProfileCheck = Prisma.sql`(
    p.website IS NOT NULL OR
    p.youtube IS NOT NULL OR
    p.twitter IS NOT NULL OR
    p.linkedin IS NOT NULL OR
    p.instagram IS NOT NULL OR
    p.tiktok IS NOT NULL
  )`;

  const orderByClause =
    status === "discover"
      ? starred === true
        ? Prisma.sql`dp.starredAt ASC`
        : Prisma.sql`finalScore DESC, ${hasProfileCheck} DESC, p.id ASC`
      : status === "invited"
        ? Prisma.sql`dp.invitedAt ASC`
        : Prisma.sql`enrolled.createdAt DESC, p.id ASC`;

  const offset = (page - 1) * pageSize;

  // Helper function to build discoverable partners filter with any alias
  const buildDiscoverablePartnersFilter = (alias: string) => {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`${Prisma.raw(alias)}.discoverableAt IS NOT NULL`,
    ];

    if (partnerIds && partnerIds.length > 0) {
      conditions.push(
        Prisma.sql`${Prisma.raw(alias)}.id IN (${Prisma.join(partnerIds)})`,
      );
    }

    if (country) {
      conditions.push(Prisma.sql`${Prisma.raw(alias)}.country = ${country}`);
    }

    return Prisma.join(conditions, " AND ");
  };

  // OPTIMIZATION: Build filter for discoverable partners to reuse in subqueries
  // This dramatically reduces the dataset from 1.5M to 5,000 before expensive joins
  const discoverablePartnersFilter =
    buildDiscoverablePartnersFilter("p_filter");

  // Build filter for all-program metrics join (uses different alias)
  const discoverablePartnersAllProgramsFilter =
    buildDiscoverablePartnersFilter("p_filter_all");

  // Metrics across ALL programs (for display purposes)
  const allProgramMetricsJoin = Prisma.sql`LEFT JOIN (
    SELECT 
      pe_all.partnerId,
      MAX(pe_all.lastConversionAt) as lastConversionAt,
      AVG(COALESCE(pe_all.conversionRate, 0)) as avgConversionRate
    FROM ProgramEnrollment pe_all
    -- OPTIMIZATION: Only process enrollments for discoverable partners
    INNER JOIN Partner p_filter_all ON p_filter_all.id = pe_all.partnerId 
      AND ${discoverablePartnersAllProgramsFilter}
    WHERE pe_all.programId != ${ACME_PROGRAM_ID}
      AND pe_all.totalConversions > 0
    GROUP BY pe_all.partnerId
  ) allProgramMetrics ON allProgramMetrics.partnerId = p.id`;

  const similarProgramMetricsJoin =
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
        LEAST(15, COUNT(DISTINCT pe2.programId) * 2) as programMatchScore
      FROM ProgramEnrollment pe2
      -- OPTIMIZATION: Only process enrollments for discoverable partners
      INNER JOIN Partner p_filter ON p_filter.id = pe2.partnerId 
        AND ${discoverablePartnersFilter}
      WHERE pe2.programId IN (${Prisma.join(similarPrograms.map((sp) => sp.programId))})
        AND pe2.status = 'approved'
      GROUP BY pe2.partnerId
    ) similarProgramMetrics ON similarProgramMetrics.partnerId = p.id`
      : Prisma.sql`LEFT JOIN (
          SELECT 
            NULL as partnerId, 
            NULL as similarityScore, 
            NULL as programMatchScore
            WHERE FALSE
        ) similarProgramMetrics ON similarProgramMetrics.partnerId = p.id`;

  // Build discoverable partners subquery for main FROM clause
  const discoverablePartnersSubqueryFilter =
    buildDiscoverablePartnersFilter("p_sub");

  // Build discoverable partners filter for categories subquery
  const discoverablePartnersCategoriesFilter =
    buildDiscoverablePartnersFilter("p_cat");

  const partners = await prisma.$queryRaw<Array<any>>`
    SELECT 
      p.*,
      COALESCE(pe.lastConversionAt, allProgramMetrics.lastConversionAt) as lastConversionAt,
      COALESCE(pe.conversionRate, allProgramMetrics.avgConversionRate) as conversionRate,
      dp.starredAt,
      dp.ignoredAt,
      dp.invitedAt,
      partnerCategories.categories as categories,
      CASE WHEN enrolled.status = 'approved' THEN enrolled.createdAt ELSE NULL END as recruitedAt,
      preferredEarningStructuresData.preferredEarningStructures as preferredEarningStructures,
      salesChannelsData.salesChannels as salesChannels,

      -- FINAL SCORE (0-265+ points): Similarity-based ranking for discovery
      -- Trusted partners (trustedAt IS NOT NULL) get 200 bonus points to rank at the top
      (
        -- Trusted partner bonus: 200 points for partners with trustedAt set
        CASE WHEN p.trustedAt IS NOT NULL THEN 200 ELSE 0 END +
        COALESCE(similarProgramMetrics.similarityScore, 0) +
        COALESCE(similarProgramMetrics.programMatchScore, 0)
      ) as finalScore
    FROM (
      -- OPTIMIZATION: Filter to discoverable partners FIRST using subquery
      -- This dramatically reduces the dataset from 1.5M to 5,000 before expensive joins
      SELECT p_sub.*
      FROM Partner p_sub
      WHERE ${discoverablePartnersSubqueryFilter}
    ) p
   
    -- Current program enrollment (for display metrics and filtering)
    LEFT JOIN ProgramEnrollment pe ON pe.partnerId = p.id AND pe.programId = ${programId}
   
    -- Enrollment status for the current program
    LEFT JOIN ProgramEnrollment enrolled ON enrolled.partnerId = p.id AND enrolled.programId = ${programId}
   
    -- Discovered partner metadata
    LEFT JOIN DiscoveredPartner dp ON dp.partnerId = p.id AND dp.programId = ${programId}

    ${allProgramMetricsJoin}

    ${similarProgramMetricsJoin}

    -- OPTIMIZATION: Only get categories for discoverable partners
    LEFT JOIN (
      SELECT 
        pe5.partnerId,
        GROUP_CONCAT(DISTINCT pc.category ORDER BY pc.category SEPARATOR ',') as categories
      FROM ProgramEnrollment pe5
      INNER JOIN Partner p_cat ON p_cat.id = pe5.partnerId AND ${discoverablePartnersCategoriesFilter}
      JOIN ProgramCategory pc ON pc.programId = pe5.programId
      WHERE pe5.status = 'approved'
      GROUP BY pe5.partnerId
    ) partnerCategories ON partnerCategories.partnerId = p.id

    -- OPTIMIZATION: Only get preferred earning structures for discoverable partners
    LEFT JOIN (
      SELECT 
        ppes.partnerId,
        GROUP_CONCAT(DISTINCT ppes.preferredEarningStructure ORDER BY ppes.preferredEarningStructure SEPARATOR ',') as preferredEarningStructures
      FROM PartnerPreferredEarningStructure ppes
      WHERE ppes.partnerId IN (
        SELECT p_filter.id
        FROM Partner p_filter
        WHERE ${buildDiscoverablePartnersFilter("p_filter")}
      )
      GROUP BY ppes.partnerId
    ) preferredEarningStructuresData ON preferredEarningStructuresData.partnerId = p.id

    -- OPTIMIZATION: Only get sales channels for discoverable partners
    LEFT JOIN (
      SELECT 
        psc.partnerId,
        GROUP_CONCAT(DISTINCT psc.salesChannel ORDER BY psc.salesChannel SEPARATOR ',') as salesChannels
      FROM PartnerSalesChannel psc
      WHERE psc.partnerId IN (
        SELECT p_filter.id
        FROM Partner p_filter
        WHERE ${buildDiscoverablePartnersFilter("p_filter")}
      )
      GROUP BY psc.partnerId
    ) salesChannelsData ON salesChannelsData.partnerId = p.id

    WHERE ${whereClause}
    ORDER BY ${orderByClause}
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  return partners;
}
