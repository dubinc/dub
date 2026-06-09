import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  PARTNER_CONTENT_SEARCH_LIMITS,
  PARTNER_CONTENT_SEARCH_MODELS,
} from "@/lib/partner-content-search/constants";
import {
  embedPartnerContentTexts,
  serializeEmbeddingForVector,
} from "@/lib/partner-content-search/voyage";
import { prisma } from "@dub/prisma";
import { PlatformType, Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DEFAULT_PARTNER_LIMIT = 20;
const DEFAULT_CHUNKS_PER_PARTNER = 2;

const partnerNetworkContentSearchSchema = z.object({
  query: z.string().trim().max(500).optional(),
  platform: z.enum(PlatformType),
  starred: z.boolean().optional(),
  limit: z.number().int().positive().max(50).default(DEFAULT_PARTNER_LIMIT),
  chunksPerPartner: z
    .number()
    .int()
    .positive()
    .max(4)
    .default(DEFAULT_CHUNKS_PER_PARTNER),
  candidateChunkCount: z
    .number()
    .int()
    .positive()
    .max(PARTNER_CONTENT_SEARCH_LIMITS.chunkCandidateCount)
    .optional(),
});

type PartnerNetworkContentSearchRow = {
  chunkId: string;
  partnerContentItemId: string;
  partnerId: string;
  partnerName: string;
  partnerUsername: string | null;
  partnerImage: string | null;
  partnerDescription: string | null;
  platformType: string;
  platformIdentifier: string;
  platformContentId: string;
  contentUrl: string;
  contentTitle: string | null;
  contentThumbnailUrl: string | null;
  contentPublishedAt: Date | null;
  chunkText: string;
  startMs: number | null;
  endMs: number | null;
  distance: number | string;
};

// POST /api/network/partners/content-search - semantic search over indexed partner content
export const POST = withWorkspace(
  async ({ workspace, req }) => {
    try {
      const programId = getDefaultProgramIdOrThrow(workspace);

      const { partnerNetworkEnabledAt } =
        await prisma.program.findUniqueOrThrow({
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
        ? (body.candidateChunkCount ??
          Math.min(
            PARTNER_CONTENT_SEARCH_LIMITS.chunkCandidateCount,
            Math.max(25, body.limit * body.chunksPerPartner * 6),
          ))
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
        embeddingModel: PARTNER_CONTENT_SEARCH_MODELS.embedding.model,
        resultCount: rows.length,
        partners: groupPartnerSearchResults({
          rows,
          limit: body.limit,
          chunksPerPartner: body.chunksPerPartner,
        }),
      });
    } catch (error) {
      return handleAndReturnErrorResponse(error);
    }
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
  const [queryEmbedding] = await embedPartnerContentTexts({
    input: [query],
    inputType: "query",
  });
  const queryVector = serializeEmbeddingForVector(queryEmbedding);
  const starredFilter =
    starred === true
      ? Prisma.sql`AND dp.starredAt IS NOT NULL`
      : starred === false
        ? Prisma.sql`AND (dp.starredAt IS NULL OR dp.id IS NULL)`
        : Prisma.empty;

  return await prisma.$queryRaw<PartnerNetworkContentSearchRow[]>(Prisma.sql`
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
      c.text AS chunkText,
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

  return await prisma.$queryRaw<PartnerNetworkContentSearchRow[]>(Prisma.sql`
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

function groupPartnerSearchResults({
  rows,
  limit,
  chunksPerPartner,
}: {
  rows: PartnerNetworkContentSearchRow[];
  limit: number;
  chunksPerPartner: number;
}) {
  const partners = new Map<
    string,
    {
      partnerId: string;
      name: string;
      username: string | null;
      image: string | null;
      description: string | null;
      bestDistance: number;
      score: number;
      chunks: ReturnType<typeof toChunkResult>[];
    }
  >();

  for (const row of rows) {
    const distance = Number(row.distance);
    const partner = partners.get(row.partnerId) ?? {
      partnerId: row.partnerId,
      name: row.partnerName,
      username: row.partnerUsername,
      image: row.partnerImage,
      description: row.partnerDescription,
      bestDistance: distance,
      score: toScore(distance),
      chunks: [],
    };

    partner.bestDistance = Math.min(partner.bestDistance, distance);
    partner.score = toScore(partner.bestDistance);

    if (partner.chunks.length < chunksPerPartner) {
      partner.chunks.push(toChunkResult(row, distance));
    }

    partners.set(row.partnerId, partner);
  }

  return Array.from(partners.values())
    .sort((a, b) => a.bestDistance - b.bestDistance)
    .slice(0, limit);
}

function toChunkResult(row: PartnerNetworkContentSearchRow, distance: number) {
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
      text: row.chunkText,
      startMs: row.startMs,
      endMs: row.endMs,
    },
    distance,
    score: toScore(distance),
  };
}

function toScore(distance: number) {
  return Number((1 - distance).toFixed(6));
}
