import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withAdmin } from "@/lib/auth";
import {
  PARTNER_CONTENT_SEARCH_LIMITS,
  PARTNER_CONTENT_SEARCH_MODELS,
  PARTNER_CONTENT_SEARCH_VOYAGE_QUERY_TIMEOUT_MS,
} from "@/lib/partner-content-search/constants";
import { searchAdminPartnerContentChunks } from "@/lib/partner-content-search/retrieval";
import {
  groupPartnerSearchResults,
  rerankPartnerSearchRows,
  toScore,
  type PartnerContentSearchRow,
} from "@/lib/partner-content-search/search-utils";
import {
  embedPartnerContentTexts,
  serializeEmbeddingForVector,
  VoyageTimeoutError,
} from "@/lib/partner-content-search/voyage";
import { partnerAdminContentSearchSchema } from "@/lib/zod/schemas/partner-network";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/admin/partner-content/search
export const POST = withAdmin(
  async ({ req }) => {
    try {
      const body = partnerAdminContentSearchSchema.parse(
        await parseRequestBody(req),
      );
      const candidateChunkCount =
        body.candidateChunkCount ??
        Math.min(
          PARTNER_CONTENT_SEARCH_LIMITS.chunkCandidateCount,
          Math.max(25, body.limit * body.chunksPerPartner * 5),
        );

      let queryEmbedding: number[];
      try {
        [queryEmbedding] = await embedPartnerContentTexts({
          input: [body.query],
          inputType: "query",
          timeoutMs: PARTNER_CONTENT_SEARCH_VOYAGE_QUERY_TIMEOUT_MS,
        });
      } catch (error) {
        if (error instanceof VoyageTimeoutError) {
          throw new DubApiError({
            code: "internal_server_error",
            message: "Partner content search timed out. Please try again.",
          });
        }
        throw error;
      }

      const queryVector = serializeEmbeddingForVector(queryEmbedding);
      const candidateRows = await searchAdminPartnerContentChunks({
        queryVector,
        limit: candidateChunkCount,
        partnerIds: body.partnerIds,
        platform: body.platform,
      });
      const { rows, reranked } = body.rerank
        ? await rerankPartnerSearchRows({
            query: body.query,
            rows: candidateRows,
          })
        : { rows: candidateRows, reranked: false };

      return NextResponse.json({
        success: true,
        query: body.query,
        candidateChunkCount,
        embeddingModel: PARTNER_CONTENT_SEARCH_MODELS.embedding.id,
        reranked,
        rerankModel: reranked
          ? PARTNER_CONTENT_SEARCH_MODELS.reranker.model
          : null,
        resultCount: rows.length,
        partners: groupPartnerSearchResults({
          rows,
          limit: body.limit,
          chunksPerPartner: body.chunksPerPartner,
          toChunkResult,
        }),
      });
    } catch (error) {
      return handleAndReturnErrorResponse(error);
    }
  },
  {
    requiredRoles: ["owner"],
  },
);

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
      title: row.contentTitle,
      thumbnailUrl: row.contentThumbnailUrl,
      publishedAt: row.contentPublishedAt?.toISOString() ?? null,
      durationMs: row.contentDurationMs,
    },
    chunk: {
      source: row.chunkSource,
      index: row.chunkIndex,
      chunkText: row.chunkText,
      startMs: row.startMs,
      endMs: row.endMs,
    },
    distance,
    score: row.rerankScore ?? toScore(distance),
    cosineScore: toScore(distance),
    rerankScore: row.rerankScore ?? null,
  };
}
