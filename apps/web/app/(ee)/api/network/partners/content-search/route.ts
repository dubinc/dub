import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  PARTNER_CONTENT_SEARCH_DEFAULT_CHUNKS_PER_PARTNER,
  PARTNER_CONTENT_SEARCH_LIMITS,
  PARTNER_CONTENT_SEARCH_MODELS,
  PARTNER_CONTENT_SEARCH_PARTNER_LIMIT,
  PARTNER_CONTENT_SEARCH_VOYAGE_QUERY_TIMEOUT_MS,
} from "@/lib/partner-content-search/constants";
import {
  groupPartnerSearchResults,
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

const DEFAULT_PARTNER_LIMIT = 20;

const partnerNetworkContentSearchSchema = z.object({
  query: z.string().trim().max(500).optional(),
  platform: z.enum(PlatformType),
  starred: z.boolean().optional(),
  limit: z
    .number()
    .int()
    .positive()
    .max(PARTNER_CONTENT_SEARCH_PARTNER_LIMIT)
    .default(DEFAULT_PARTNER_LIMIT),
  chunksPerPartner: z
    .number()
    .int()
    .positive()
    .max(4)
    .default(PARTNER_CONTENT_SEARCH_DEFAULT_CHUNKS_PER_PARTNER),
  candidateChunkCount: z
    .number()
    .int()
    .positive()
    .max(PARTNER_CONTENT_SEARCH_LIMITS.chunkCandidateCount)
    .optional(),
});

// POST /api/network/partners/content-search - semantic search over indexed partner content
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
    const candidateChunkCount = body.query
      ? body.candidateChunkCount ??
        Math.min(
          PARTNER_CONTENT_SEARCH_LIMITS.chunkCandidateCount,
          Math.max(25, body.limit * body.chunksPerPartner * 6),
        )
      : body.limit * body.chunksPerPartner * 2;

    const rows = body.query
      ? await searchPartnerNetworkContent({
          programId,
          query: body.query,
          platform: body.platform,
          starred: body.starred,
          limit: candidateChunkCount,
        })
      : await listPartnerNetworkContent({
          programId,
          platform: body.platform,
          starred: body.starred,
          limit: candidateChunkCount,
        });

    return NextResponse.json({
      success: true,
      query: body.query ?? null,
      platform: body.platform,
      candidateChunkCount,
      embeddingModel: PARTNER_CONTENT_SEARCH_MODELS.embedding.id,
      resultCount: rows.length,
      partners: groupPartnerSearchResults({
        rows,
        limit: body.limit,
        chunksPerPartner: body.chunksPerPartner,
        toChunkResult,
      }),
    });
  },
  {
    requiredPlan: ["enterprise", "advanced"],
  },
);

async function searchPartnerNetworkContent({
  programId,
  query,
  platform,
  starred,
  limit,
}: {
  programId: string;
  query: string;
  platform: PlatformType;
  starred?: boolean;
  limit: number;
}) {
  let queryEmbedding: number[];
  try {
    [queryEmbedding] = await embedPartnerContentTexts({
      input: [query],
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
  const starredFilter =
    starred === true
      ? Prisma.sql`AND dp.starredAt IS NOT NULL`
      : starred === false
        ? Prisma.sql`AND (dp.starredAt IS NULL OR dp.id IS NULL)`
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
      pci.title AS contentTitle,
      pci.thumbnailUrl AS contentThumbnailUrl,
      pci.publishedAt AS contentPublishedAt,
      c.source AS chunkSource,
      c.chunkText,
      c.startMs,
      c.endMs,
      DISTANCE(TO_VECTOR(${queryVector}), c.embedding, 'cosine') AS distance
    FROM PartnerContentChunk c
    INNER JOIN PartnerContentItem pci ON pci.id = c.partnerContentItemId
    INNER JOIN Partner p ON p.id = c.partnerId
    INNER JOIN PartnerPlatform pp ON pp.id = pci.partnerPlatformId
    LEFT JOIN ProgramEnrollment enrolled
      ON enrolled.partnerId = p.id
      AND enrolled.programId = ${programId}
    LEFT JOIN DiscoveredPartner dp
      ON dp.partnerId = p.id
      AND dp.programId = ${programId}
    WHERE c.embedding IS NOT NULL
      AND c.embeddingModel = ${PARTNER_CONTENT_SEARCH_MODELS.embedding.id}
      AND pp.type = ${platform}
      AND p.networkStatus IN ("approved", "trusted")
      AND enrolled.id IS NULL
      AND (dp.ignoredAt IS NULL OR dp.id IS NULL)
      ${starredFilter}
    ORDER BY distance ASC
    LIMIT ${limit}
  `);
}

async function listPartnerNetworkContent({
  programId,
  platform,
  starred,
  limit,
}: {
  programId: string;
  platform: PlatformType;
  starred?: boolean;
  limit: number;
}) {
  const starredFilter =
    starred === true
      ? Prisma.sql`AND dp.starredAt IS NOT NULL`
      : starred === false
        ? Prisma.sql`AND (dp.starredAt IS NULL OR dp.id IS NULL)`
        : Prisma.empty;

  return await prisma.$queryRaw<PartnerContentSearchRow[]>(Prisma.sql`
    SELECT
      MIN(c.id) AS chunkId,
      pci.id AS partnerContentItemId,
      pci.partnerId,
      p.name AS partnerName,
      p.username AS partnerUsername,
      p.image AS partnerImage,
      p.description AS partnerDescription,
      pp.type AS platformType,
      pp.identifier AS platformIdentifier,
      pci.platformContentId,
      pci.url AS contentUrl,
      pci.title AS contentTitle,
      pci.thumbnailUrl AS contentThumbnailUrl,
      pci.publishedAt AS contentPublishedAt,
      MIN(c.source) AS chunkSource,
      "" AS chunkText,
      NULL AS startMs,
      NULL AS endMs,
      0 AS distance
    FROM PartnerContentItem pci
    INNER JOIN PartnerContentChunk c ON c.partnerContentItemId = pci.id
    INNER JOIN Partner p ON p.id = pci.partnerId
    INNER JOIN PartnerPlatform pp ON pp.id = pci.partnerPlatformId
    LEFT JOIN ProgramEnrollment enrolled
      ON enrolled.partnerId = p.id
      AND enrolled.programId = ${programId}
    LEFT JOIN DiscoveredPartner dp
      ON dp.partnerId = p.id
      AND dp.programId = ${programId}
    WHERE c.embedding IS NOT NULL
      AND c.embeddingModel = ${PARTNER_CONTENT_SEARCH_MODELS.embedding.id}
      AND pp.type = ${platform}
      AND p.networkStatus IN ("approved", "trusted")
      AND enrolled.id IS NULL
      AND (dp.ignoredAt IS NULL OR dp.id IS NULL)
      ${starredFilter}
    GROUP BY
      pci.id,
      pci.partnerId,
      p.name,
      p.username,
      p.image,
      p.description,
      pp.type,
      pp.identifier,
      pci.platformContentId,
      pci.url,
      pci.title,
      pci.thumbnailUrl,
      pci.publishedAt
    ORDER BY pci.publishedAt DESC, pci.id ASC
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
    },
    chunk: {
      source: row.chunkSource,
      text: row.chunkText,
      startMs: row.startMs,
      endMs: row.endMs,
    },
    distance,
    score: toScore(distance),
  };
}
