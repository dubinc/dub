import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { ACME_PROGRAM_ID } from "@dub/utils";

interface ImprovedRankingParams {
  programId: string;
  partnerIds?: string[];
  status?: "discover" | "invited" | "recruited";
  country?: string;
  starred?: boolean | null;
  page: number;
  pageSize: number;
  salesChannels?: string[];
  preferredEarningStructures?: string[];
}

export async function getImprovedPartnerRanking({
  programId,
  partnerIds,
  status,
  country,
  starred,
  page,
  pageSize,
  salesChannels,
  preferredEarningStructures,
}: ImprovedRankingParams) {
  const partners = (await prisma.$queryRaw`
    SELECT 
      p.*,
      preferredEarningStructures.preferredEarningStructures,
      salesChannels.salesChannels,
      
      -- Basic metrics
      COALESCE(globalMetrics.totalClicks, 0) as totalClicks,
      COALESCE(globalMetrics.totalLeads, 0) as totalLeads,
      COALESCE(globalMetrics.totalConversions, 0) as totalConversions,
      COALESCE(globalMetrics.totalSaleAmount, 0) as totalSaleAmount,
      COALESCE(globalMetrics.conversionRate, 0) as conversionRate,
      globalMetrics.lastConversionAt as lastConversionAt,
      
      -- Program-specific metrics
      COALESCE(programMetrics.programClicks, 0) as programClicks,
      COALESCE(programMetrics.programConversions, 0) as programConversions,
      COALESCE(programMetrics.programConversionRate, 0) as programConversionRate,
      COALESCE(programMetrics.programSaleAmount, 0) as programSaleAmount,
      
      -- Discovery metadata
      dp.starredAt as starredAt,
      dp.ignoredAt as ignoredAt,
      dp.invitedAt as invitedAt,
      case
        when pe.status = 'approved' then pe.createdAt
        else null
      end as recruitedAt,
      COALESCE(commissions.totalCommissions, 0) as totalCommissions,
      
      -- ENHANCED SCORING SYSTEM --
      
      -- 1. Enhanced Program Similarity Scores (0-1)
      COALESCE(similarityScores.avgSimilarityScore, 0) as programSimilarityScore,
      COALESCE(similarityScores.avgPartnerOverlapScore, 0) as avgPartnerOverlapScore,
      COALESCE(similarityScores.avgPerformancePatternScore, 0) as avgPerformancePatternScore,
      COALESCE(similarityScores.avgCategoryOverlapScore, 0) as avgCategoryOverlapScore,
      COALESCE(similarityScores.topSimilarityScore, 0) as topSimilarityScore,
      COALESCE(similarityScores.similarProgramCount, 0) as similarProgramCount,
      
      -- 2. Program-Level Performance Score (0-1)
      COALESCE(programPerformance.performanceScore, 0) as programLevelPerformanceScore,
      
      -- 3. Wilson Score for Global Performance (0-1)
      CASE 
        WHEN COALESCE(globalMetrics.totalClicks, 0) = 0 THEN 0
        ELSE (
          (COALESCE(globalMetrics.totalConversions, 0)/COALESCE(globalMetrics.totalClicks, 0) + 1.96*1.96/(2*COALESCE(globalMetrics.totalClicks, 0))) - 
          1.96 * SQRT((COALESCE(globalMetrics.totalConversions, 0)/COALESCE(globalMetrics.totalClicks, 0) * (1-COALESCE(globalMetrics.totalConversions, 0)/COALESCE(globalMetrics.totalClicks, 0)) + 1.96*1.96/(4*COALESCE(globalMetrics.totalClicks, 0)))/COALESCE(globalMetrics.totalClicks, 0))
        ) / (1 + 1.96*1.96/COALESCE(globalMetrics.totalClicks, 0))
      END as wilsonScore,
      
      -- 4. Sample Size Confidence (0-1)
      LEAST(1.0, COALESCE(globalMetrics.totalClicks, 0) / 50.0) as sampleSizeMultiplier,
      
      -- 5. Revenue Quality Score (0-1)
      CASE 
        WHEN COALESCE(globalMetrics.totalConversions, 0) = 0 OR COALESCE(globalMetrics.totalSaleAmount, 0) = 0 THEN 0
        ELSE LEAST(1.0, (
          LN(COALESCE(globalMetrics.totalSaleAmount, 0)/COALESCE(globalMetrics.totalConversions, 0)/10000 + 1) * 0.4 + 
          LN(COALESCE(globalMetrics.totalConversions, 0) + 1) * 0.6
        ) / 8)
      END as revenueScore,
      
      -- 6. Program Diversity Bonus (1.0-2.0)
      CASE 
        WHEN COALESCE(programDiversity.programsWithConversions, 0) <= 1 THEN 1.0
        ELSE LEAST(2.0, 1.0 + (COALESCE(programDiversity.programsWithConversions, 0) - 1) * 0.3)
      END as programDiversityBonus,
      
      -- 7. Recency Bonus (0.5-1.0)
      CASE 
        WHEN globalMetrics.lastConversionAt IS NULL THEN 0.5
        WHEN DATEDIFF(NOW(), globalMetrics.lastConversionAt) <= 30 THEN 1.0
        WHEN DATEDIFF(NOW(), globalMetrics.lastConversionAt) <= 90 THEN 0.9
        WHEN DATEDIFF(NOW(), globalMetrics.lastConversionAt) <= 180 THEN 0.8
        WHEN DATEDIFF(NOW(), globalMetrics.lastConversionAt) <= 365 THEN 0.7
        ELSE 0.5
      END as recencyBonus,
      
      -- FINAL COMBINED SCORE (0-100) - REBALANCED FORMULA!
      (
        -- Base performance (35% weight) - increased from 30%
        (
          CASE 
            WHEN COALESCE(globalMetrics.totalClicks, 0) = 0 THEN 0
            ELSE (
              (COALESCE(globalMetrics.totalConversions, 0)/COALESCE(globalMetrics.totalClicks, 0) + 1.96*1.96/(2*COALESCE(globalMetrics.totalClicks, 0))) - 
              1.96 * SQRT((COALESCE(globalMetrics.totalConversions, 0)/COALESCE(globalMetrics.totalClicks, 0) * (1-COALESCE(globalMetrics.totalConversions, 0)/COALESCE(globalMetrics.totalClicks, 0)) + 1.96*1.96/(4*COALESCE(globalMetrics.totalClicks, 0)))/COALESCE(globalMetrics.totalClicks, 0))
            ) / (1 + 1.96*1.96/COALESCE(globalMetrics.totalClicks, 0))
          END * 
          LEAST(1.0, COALESCE(globalMetrics.totalClicks, 0) / 50.0)
        ) * 0.35 +
        
        -- Enhanced program similarity (35% weight) - increased from 25%
        (
          -- Partner overlap (60% of similarity weight = 21% total) - proven success
          COALESCE(similarityScores.avgPartnerOverlapScore, 0) * 0.21 +
          -- Performance pattern (30% of similarity weight = 10.5% total) - similar business models
          COALESCE(similarityScores.avgPerformancePatternScore, 0) * 0.105 +
          -- Category overlap (10% of similarity weight = 3.5% total) - category alignment
          COALESCE(similarityScores.avgCategoryOverlapScore, 0) * 0.035
        ) +
        
        -- Revenue quality (20% weight) - increased from 15%
        (
          CASE 
            WHEN COALESCE(globalMetrics.totalConversions, 0) = 0 OR COALESCE(globalMetrics.totalSaleAmount, 0) = 0 THEN 0
            ELSE LEAST(1.0, (
              LN(COALESCE(globalMetrics.totalSaleAmount, 0)/COALESCE(globalMetrics.totalConversions, 0)/10000 + 1) * 0.4 + 
              LN(COALESCE(globalMetrics.totalConversions, 0) + 1) * 0.6
            ) / 8)
          END
        ) * 0.20 +
        
        -- Program-level performance (10% weight) - unchanged
        COALESCE(programPerformance.performanceScore, 0) * 0.10
      ) * 
      -- Apply multipliers
      (
        CASE 
          WHEN COALESCE(programDiversity.programsWithConversions, 0) <= 1 THEN 1.0
          ELSE LEAST(2.0, 1.0 + (COALESCE(programDiversity.programsWithConversions, 0) - 1) * 0.3)
        END
      ) *
      (
        CASE 
          WHEN globalMetrics.lastConversionAt IS NULL THEN 0.5
          WHEN DATEDIFF(NOW(), globalMetrics.lastConversionAt) <= 30 THEN 1.0
          WHEN DATEDIFF(NOW(), globalMetrics.lastConversionAt) <= 90 THEN 0.9
          WHEN DATEDIFF(NOW(), globalMetrics.lastConversionAt) <= 180 THEN 0.8
          WHEN DATEDIFF(NOW(), globalMetrics.lastConversionAt) <= 365 THEN 0.7
          ELSE 0.5
        END
      ) * 100 as enhancedCombinedScore
      
    FROM 
      Partner p
    -- Program enrollment data
    LEFT JOIN ProgramEnrollment pe ON pe.partnerId = p.id AND pe.programId = ${programId}
    LEFT JOIN DiscoveredPartner dp ON dp.partnerId = p.id AND dp.programId = ${programId}
    
    -- Global partner metrics (across all programs)
    LEFT JOIN (
      SELECT 
        partnerId,
        MAX(lastConversionAt) as lastConversionAt,
        SUM(clicks) as totalClicks,
        SUM(leads) as totalLeads,
        SUM(conversions) as totalConversions,
        SUM(saleAmount) as totalSaleAmount,
        COALESCE(SUM(conversions) / NULLIF(SUM(clicks), 0), 0) as conversionRate
      FROM Link
      WHERE programId IS NOT NULL
      AND programId != ${ACME_PROGRAM_ID}
      AND partnerId IS NOT NULL
      GROUP BY partnerId
    ) globalMetrics ON globalMetrics.partnerId = p.id
    
    -- Program-specific metrics (for similar programs) - NEW!
    LEFT JOIN (
      SELECT 
        l.partnerId,
        SUM(l.clicks) as programClicks,
        SUM(l.conversions) as programConversions,
        SUM(l.saleAmount) as programSaleAmount,
        COALESCE(SUM(l.conversions) / NULLIF(SUM(l.clicks), 0), 0) as programConversionRate
      FROM Link l
      INNER JOIN ProgramSimilarity ps ON (ps.programId = ${programId} AND ps.similarProgramId = l.programId)
        OR (ps.similarProgramId = ${programId} AND ps.programId = l.programId)
      WHERE l.programId != ${ACME_PROGRAM_ID}
      AND l.partnerId IS NOT NULL
      AND ps.combinedSimilarityScore >= 0.3 -- Only include reasonably similar programs
      GROUP BY l.partnerId
    ) programMetrics ON programMetrics.partnerId = p.id
    
    -- Enhanced program similarity scores
    LEFT JOIN (
      SELECT 
        partnerPrograms.partnerId,
        AVG(ps.combinedSimilarityScore) as avgSimilarityScore,
        AVG(ps.partnerOverlapScore) as avgPartnerOverlapScore,
        AVG(ps.performancePatternScore) as avgPerformancePatternScore,
        AVG(ps.categoryOverlapScore) as avgCategoryOverlapScore,
        MAX(ps.combinedSimilarityScore) as topSimilarityScore,
        COUNT(DISTINCT ps.similarProgramId) as similarProgramCount
      FROM (
        SELECT DISTINCT partnerId, programId
        FROM Link 
        WHERE programId IS NOT NULL 
        AND programId != ${ACME_PROGRAM_ID}
        AND conversions > 0 -- Only consider programs where partner had success
      ) partnerPrograms
      INNER JOIN ProgramSimilarity ps ON (
        (ps.programId = ${programId} AND ps.similarProgramId = partnerPrograms.programId)
        OR (ps.similarProgramId = ${programId} AND ps.programId = partnerPrograms.programId)
      )
      WHERE ps.combinedSimilarityScore >= 0.2 -- Minimum similarity threshold
      GROUP BY partnerPrograms.partnerId
    ) similarityScores ON similarityScores.partnerId = p.id
    
    -- Program-level performance tracking - NEW!
    LEFT JOIN (
      SELECT 
        partnerId,
        AVG(performanceScore) as performanceScore
      FROM PartnerProgramPerformance ppp
      INNER JOIN ProgramSimilarity ps ON (
        (ps.programId = ${programId} AND ps.similarProgramId = ppp.programId)
        OR (ps.similarProgramId = ${programId} AND ps.programId = ppp.programId)
      )
      WHERE ps.combinedSimilarityScore >= 0.3
      GROUP BY partnerId
    ) programPerformance ON programPerformance.partnerId = p.id
    
    -- Total commissions across all programs
    LEFT JOIN (
      SELECT 
        partnerId,
        SUM(totalCommissions) as totalCommissions
      FROM ProgramEnrollment
      WHERE programId != ${ACME_PROGRAM_ID}
      GROUP BY partnerId
    ) commissions ON commissions.partnerId = p.id
    
    -- Program diversity bonus
    LEFT JOIN (
      SELECT 
        partnerId,
        COUNT(DISTINCT programId) as programsWithConversions
      FROM Link
      WHERE programId IS NOT NULL
      AND programId != ${ACME_PROGRAM_ID}
      AND partnerId IS NOT NULL
      AND conversions > 0
      GROUP BY partnerId
    ) programDiversity ON programDiversity.partnerId = p.id
    
    -- Profile field lists (industryInterests removed as no longer used)
    LEFT JOIN (
      SELECT partnerId, group_concat(preferredEarningStructure) AS preferredEarningStructures
      FROM PartnerPreferredEarningStructure
      GROUP BY partnerId
    ) preferredEarningStructures ON preferredEarningStructures.partnerId = p.id
    LEFT JOIN (
      SELECT partnerId, group_concat(salesChannel) AS salesChannels
      FROM PartnerSalesChannel
      GROUP BY partnerId
    ) salesChannels ON salesChannels.partnerId = p.id
    
    WHERE 
      p.discoverableAt IS NOT NULL
      AND dp.ignoredAt IS NULL
      AND COALESCE(globalMetrics.conversionRate, 0) < 1 -- Exclude unrealistic conversion rates
      ${partnerIds && partnerIds.length > 0 ? Prisma.sql`AND p.id IN (${Prisma.join(partnerIds)})` : Prisma.sql``}
      ${country ? Prisma.sql`AND p.country = ${country}` : Prisma.sql``}
      ${
        status === "discover"
          ? Prisma.sql`AND pe.id IS NULL`
          : status === "invited"
            ? Prisma.sql`AND pe.status = 'invited' AND dp.invitedAt IS NOT NULL`
            : Prisma.sql`AND pe.status = 'approved' AND dp.invitedAt IS NOT NULL`
      }
      ${starred === true ? Prisma.sql`AND dp.starredAt IS NOT NULL` : Prisma.sql``}
      ${starred === false ? Prisma.sql`AND dp.starredAt IS NULL` : Prisma.sql``}
      ${salesChannels && salesChannels.length > 0 ? Prisma.sql`AND EXISTS (SELECT 1 FROM PartnerSalesChannel WHERE partnerId = p.id AND salesChannel IN (${Prisma.join(salesChannels)}))` : Prisma.sql``}
      ${preferredEarningStructures && preferredEarningStructures.length > 0 ? Prisma.sql`AND EXISTS (SELECT 1 FROM PartnerPreferredEarningStructure WHERE partnerId = p.id AND preferredEarningStructure IN (${Prisma.join(preferredEarningStructures)}))` : Prisma.sql``}
    
    ORDER BY 
      ${starred === true ? Prisma.sql`dp.starredAt DESC,` : Prisma.sql``} 
      enhancedCombinedScore DESC, 
      avgPartnerOverlapScore DESC,
      totalCommissions DESC
    
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `) satisfies Array<any>;

  return partners;
}
