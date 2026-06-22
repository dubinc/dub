import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withAdmin } from "@/lib/auth";
import {
  PARTNER_CONTENT_CHUNK_VECTOR_DISTANCE,
  PARTNER_CONTENT_SEARCH_LIMITS,
  PARTNER_CONTENT_SEARCH_MODELS,
  PARTNER_CONTENT_SEARCH_VOYAGE_QUERY_TIMEOUT_MS,
} from "@/lib/partner-content-search/constants";
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
import { prisma } from "@/lib/prisma";
import { PlatformType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DEFAULT_PARTNER_LIMIT = 10;
const DEFAULT_CHUNKS_PER_PARTNER = 3;

const partnerContentSearchSchema = z.object({
  query: z.string().trim().min(1).max(500),
  limit: z.number().int().positive().max(50).default(DEFAULT_PARTNER_LIMIT),
  chunksPerPartner: z
    .number()
    .int()
    .positive()
    .max(10)
    .default(DEFAULT_CHUNKS_PER_PARTNER),
  candidateChunkCount: z
    .number()
    .int()
    .positive()
    .max(PARTNER_CONTENT_SEARCH_LIMITS.chunkCandidateCount)
    .optional(),
  partnerIds: z.array(z.string()).min(1).max(100).optional(),
  platform: z.enum(PlatformType).optional(),
  // Second-stage reranking is on by default; pass `false` to inspect cosine-only
  // ranking for comparison.
  rerank: z.boolean().default(true),
});

// POST /api/admin/partner-content/search
export const POST = withAdmin(
  async ({ req }) => {
    try {
      const body = partnerContentSearchSchema.parse(
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
      const candidateRows = await searchPartnerContentChunks({
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

async function searchPartnerContentChunks({
  queryVector,
  limit,
  partnerIds,
  platform,
}: {
  queryVector: string;
  limit: number;
  partnerIds?: string[];
  platform?: PlatformType;
}) {
  const partnerFilter = partnerIds?.length
    ? Prisma.sql`AND c.partnerId IN (${Prisma.join(partnerIds)})`
    : Prisma.empty;
  const platformFilter = platform
    ? Prisma.sql`AND pp.type = ${platform}`
    : Prisma.empty;

  return await prisma.$queryRaw<PartnerContentSearchRow[]>(Prisma.sql`
    SELECT
      c.id AS chunkId,
      c.partnerContentItemId,
      c.partnerId,
      p.name AS partnerName,
      p.username AS partnerUsername,
      p.image AS partnerImage,
      p.description AS partnerDescription,
      pp.type AS platformType,
      pp.identifier AS platformIdentifier,
      pci.platformContentId,
      pci.url AS contentUrl,
      pci.contentType,
      pci.title AS contentTitle,
      pci.thumbnailUrl AS contentThumbnailUrl,
      pci.publishedAt AS contentPublishedAt,
      pci.durationMs AS contentDurationMs,
      c.source AS chunkSource,
      c.chunkIndex,
      c.chunkText,
      c.startMs,
      c.endMs,
      DISTANCE(TO_VECTOR(${queryVector}), c.embedding, ${Prisma.raw(`'${PARTNER_CONTENT_CHUNK_VECTOR_DISTANCE}'`)}) AS distance
    FROM PartnerContentChunk c
    INNER JOIN PartnerContentItem pci ON pci.id = c.partnerContentItemId
    INNER JOIN Partner p ON p.id = c.partnerId
    INNER JOIN PartnerPlatform pp ON pp.id = pci.partnerPlatformId
    WHERE c.embedding IS NOT NULL
      AND c.embeddingModel = ${PARTNER_CONTENT_SEARCH_MODELS.embedding.id}
      ${partnerFilter}
      ${platformFilter}
    ORDER BY distance ASC
    LIMIT ${limit}
  `);
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
