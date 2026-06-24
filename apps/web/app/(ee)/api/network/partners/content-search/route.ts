import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  PARTNER_CONTENT_SEARCH_MODELS,
  PARTNER_CONTENT_SEARCH_PARTNER_LIMIT,
} from "@/lib/partner-content-search/constants";
import { listPartnerNetworkContent } from "@/lib/partner-content-search/listing";
import { getPartnerMatchSummaries } from "@/lib/partner-content-search/match-summaries";
import { getNetworkPartnersById } from "@/lib/partner-content-search/network-partners";
import {
  createContentMatchEvidence,
  getEvidenceSource,
  getRowRelevanceScore,
  sortPartnersByTopicFit,
} from "@/lib/partner-content-search/ranking";
import { searchPartnerNetworkContent } from "@/lib/partner-content-search/retrieval";
import {
  getCandidateChunkCount,
  groupPartnerSearchResults,
  toScore,
  type PartnerContentSearchRow,
} from "@/lib/partner-content-search/search-utils";
import { createPartnerContentSearchTimingLogger } from "@/lib/partner-content-search/timing";
import { prisma } from "@/lib/prisma";
import {
  partnerNetworkContentSearchResponseSchema,
  partnerNetworkContentSearchSchema,
} from "@/lib/zod/schemas/partner-network";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/network/partners/content-search - network discover content search; returns ranked partners with matching chunks
export const POST = withWorkspace(
  async ({ workspace, req }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerNetworkEnabledAt } = await prisma.program.findUniqueOrThrow({
      select: {
        partnerNetworkEnabledAt: true,
      },
      where: {
        id: programId,
      },
    });

    if (!partnerNetworkEnabledAt) {
      throw new DubApiError({
        code: "forbidden",
        message: "Partner network is not enabled for this program.",
      });
    }

    const body = partnerNetworkContentSearchSchema.parse(
      await parseRequestBody(req),
    );
    const candidateChunkCount = getCandidateChunkCount({
      hasQuery: Boolean(body.query),
      limit: body.limit,
      chunksPerPartner: body.chunksPerPartner,
    });
    const logTiming = createPartnerContentSearchTimingLogger({
      workspaceId: workspace.id,
      programId,
      hasQuery: Boolean(body.query),
      queryLength: body.query?.length ?? 0,
      platforms: body.platforms ?? null,
      reach: body.reach ?? null,
      country: body.country ?? null,
      starred: body.starred ?? null,
      limit: body.limit,
      chunksPerPartner: body.chunksPerPartner,
      candidateChunkCount,
      rerank: body.rerank,
    });

    logTiming("request-parsed");

    const { rows, reranked, queryVector, cutoffDistance, itemSourceBestDistance } =
      body.query
        ? await searchPartnerNetworkContent({
            programId,
            query: body.query,
            platforms: body.platforms,
            country: body.country,
            partnerIds: body.partnerIds,
            starred: body.starred,
            limit: candidateChunkCount,
            rerank: body.rerank,
            logTiming,
          })
        : {
            rows: await listPartnerNetworkContent({
              programId,
              platforms: body.platforms,
              country: body.country,
              partnerIds: body.partnerIds,
              starred: body.starred,
              limit: candidateChunkCount,
            }),
            reranked: false,
            queryVector: null,
            cutoffDistance: null,
            itemSourceBestDistance: undefined,
          };
    logTiming("content-rows-loaded", {
      rowCount: rows.length,
      reranked,
      cutoffDistance,
    });
    const partnerCandidateLimit = body.query
      ? Math.min(
          PARTNER_CONTENT_SEARCH_PARTNER_LIMIT,
          Math.max(body.limit, body.limit * 3),
        )
      : body.limit;
    const partnerCandidates = groupPartnerSearchResults({
      rows,
      limit: partnerCandidateLimit,
      chunksPerPartner: body.chunksPerPartner,
      toChunkResult,
      dedupeKey: ({ partnerContentItemId }) => partnerContentItemId,
      getRowScore: getRowRelevanceScore,
    });
    logTiming("partner-candidates-grouped", {
      partnerCandidateCount: partnerCandidates.length,
      partnerCandidateLimit,
    });
    const partnerIdsToHydrate = partnerCandidates.map(
      ({ partnerId }) => partnerId,
    );
    logTiming("partner-enrichment-start", {
      partnerCandidateCount: partnerCandidates.length,
    });
    // Match summaries and card hydration share no inputs; run them in parallel    
    const [matchSummaries, networkPartners] = await Promise.all([
      getPartnerMatchSummaries({
        rows,
        partnerIds: partnerIdsToHydrate,
        platforms: body.platforms,
        queryVector,
        cutoffDistance,
        itemSourceBestDistance,
        logTiming,
      }),
      getNetworkPartnersById({
        programId,
        partnerIds: partnerIdsToHydrate,
        platforms: body.platforms,
        reach: body.reach,
        country: body.country,
      }),
    ]);
    logTiming("partner-enrichment-complete", {
      summaryCount: matchSummaries.size,
      hydratedPartnerCount: networkPartners.size,
    });
    const partners = partnerCandidates
      .map((partner) => {
        const networkPartner = networkPartners.get(partner.partnerId);
        if (!networkPartner) return null;

        return {
          ...partner,
          partner: networkPartner,
          matchSummary: matchSummaries.get(partner.partnerId) ?? null,
        };
      })
      .filter(isNonNull);
    const sortedPartners = body.query
      ? sortPartnersByTopicFit(partners)
      : partners;
    logTiming("response-ready", {
      returnedPartnerCount: Math.min(sortedPartners.length, body.limit),
    });

    return NextResponse.json(
      partnerNetworkContentSearchResponseSchema.parse({
        success: true,
        query: body.query ?? null,
        platforms: body.platforms ?? null,
        country: body.country ?? null,
        candidateChunkCount,
        embeddingModel: PARTNER_CONTENT_SEARCH_MODELS.embedding.id,
        reranked,
        rerankModel: reranked
          ? PARTNER_CONTENT_SEARCH_MODELS.reranker.model
          : null,
        resultCount: rows.length,
        partners: sortedPartners.slice(0, body.limit),
      }),
    );
  },
  {
    requiredPlan: ["enterprise", "advanced"],
  },
);

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}

function toChunkResult(row: PartnerContentSearchRow, distance: number) {
  return {
    chunkId: row.chunkId,
    partnerContentItemId: row.partnerContentItemId,
    platform: {
      type: row.platformType,
      identifier: row.platformIdentifier,
    },
    content: {
      platformContentId: row.platformContentId,
      url: row.contentUrl,
      type: row.contentType,
      title: row.contentTitle,
      description: row.contentDescription ?? null,
      thumbnailUrl: row.contentThumbnailUrl,
      publishedAt: row.contentPublishedAt?.toISOString() ?? null,
      durationMs: row.contentDurationMs,
      viewCount:
        row.contentViewCount != null ? Number(row.contentViewCount) : null,
      likeCount:
        row.contentLikeCount != null ? Number(row.contentLikeCount) : null,
      commentCount:
        row.contentCommentCount != null
          ? Number(row.contentCommentCount)
          : null,
      shareCount:
        row.contentShareCount != null ? Number(row.contentShareCount) : null,
      saveCount:
        row.contentSaveCount != null ? Number(row.contentSaveCount) : null,
    },
    chunk: {
      source: row.chunkSource,
      text: row.chunkText,
      startMs: row.startMs,
      endMs: row.endMs,
    },
    distance,
    score: getRowRelevanceScore(row),
    cosineScore: toScore(distance),
    rerankScore: row.rerankScore ?? null,
    matchEvidence: createContentMatchEvidence({
      contentType: row.contentType,
      transcriptScore:
        getEvidenceSource(row.chunkSource) === "transcript"
          ? row.rerankScore ?? toScore(distance)
          : null,
      creatorTextScore:
        getEvidenceSource(row.chunkSource) === "creatorText"
          ? row.rerankScore ?? toScore(distance)
          : null,
    }),
  };
}
