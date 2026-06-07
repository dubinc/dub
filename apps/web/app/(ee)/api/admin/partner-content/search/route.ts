import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withAdmin } from "@/lib/auth";
import {
  PARTNER_CONTENT_SEARCH_LIMITS,
  PARTNER_CONTENT_SEARCH_MODELS,
} from "@/lib/partner-content-search/constants";
import { embedPartnerContentTexts } from "@/lib/partner-content-search/voyage";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
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
});

type PartnerContentSearchRow = {
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
  contentPublishedAt: Date | null;
  chunkIndex: number;
  chunkText: string;
  startMs: number | null;
  endMs: number | null;
  distance: number | string;
};

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

      const [queryEmbedding] = await embedPartnerContentTexts({
        input: [body.query],
        inputType: "query",
      });

      const queryVector = serializeEmbedding(queryEmbedding);
      const rows = body.partnerIds?.length
        ? await searchPartnerContentChunksForPartners({
            queryVector,
            partnerIds: body.partnerIds,
            limit: candidateChunkCount,
          })
        : await searchPartnerContentChunks({
            queryVector,
            limit: candidateChunkCount,
          });

      return NextResponse.json({
        success: true,
        query: body.query,
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
    requiredRoles: ["owner"],
  },
);

async function searchPartnerContentChunks({
  queryVector,
  limit,
}: {
  queryVector: string;
  limit: number;
}) {
  return await prisma.$queryRaw<PartnerContentSearchRow[]>`
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
      pci.publishedAt AS contentPublishedAt,
      c.chunkIndex,
      c.text AS chunkText,
      c.startMs,
      c.endMs,
      DISTANCE(TO_VECTOR(${queryVector}), c.embedding, 'cosine') AS distance
    FROM PartnerContentChunk c
    INNER JOIN PartnerContentItem pci ON pci.id = c.partnerContentItemId
    INNER JOIN Partner p ON p.id = c.partnerId
    INNER JOIN PartnerPlatform pp ON pp.id = pci.partnerPlatformId
    WHERE c.embedding IS NOT NULL
    ORDER BY distance ASC
    LIMIT ${limit}
  `;
}

async function searchPartnerContentChunksForPartners({
  queryVector,
  partnerIds,
  limit,
}: {
  queryVector: string;
  partnerIds: string[];
  limit: number;
}) {
  return await prisma.$queryRaw<PartnerContentSearchRow[]>`
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
      pci.publishedAt AS contentPublishedAt,
      c.chunkIndex,
      c.text AS chunkText,
      c.startMs,
      c.endMs,
      DISTANCE(TO_VECTOR(${queryVector}), c.embedding, 'cosine') AS distance
    FROM PartnerContentChunk c
    INNER JOIN PartnerContentItem pci ON pci.id = c.partnerContentItemId
    INNER JOIN Partner p ON p.id = c.partnerId
    INNER JOIN PartnerPlatform pp ON pp.id = pci.partnerPlatformId
    WHERE c.embedding IS NOT NULL
      AND c.partnerId IN (${Prisma.join(partnerIds)})
    ORDER BY distance ASC
    LIMIT ${limit}
  `;
}

function groupPartnerSearchResults({
  rows,
  limit,
  chunksPerPartner,
}: {
  rows: PartnerContentSearchRow[];
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
      publishedAt: row.contentPublishedAt?.toISOString() ?? null,
    },
    chunk: {
      index: row.chunkIndex,
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

function serializeEmbedding(embedding: number[]) {
  const expectedDimensions = PARTNER_CONTENT_SEARCH_MODELS.embedding.dimensions;

  if (embedding.length !== expectedDimensions) {
    throw new Error(
      `Expected ${expectedDimensions} embedding dimensions, received ${embedding.length}.`,
    );
  }

  return JSON.stringify(
    embedding.map((value) => {
      if (!Number.isFinite(value)) {
        throw new Error("Voyage returned a non-finite embedding value.");
      }

      return value;
    }),
  );
}
