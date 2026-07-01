import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import "server-only";
import { PARTNER_CONTENT_SEARCH_MODELS } from "../constants";

type ChunkCounts = {
  // COUNT(*) is BIGINT; SUM(...) is DECIMAL in MySQL.
  totalChunkCount: bigint;
  embeddedChunkCount: Prisma.Decimal | null;
};

export async function refreshPartnerContentItemChunkCounts(
  partnerContentItemId: string,
) {
  const [result] = await prisma.$queryRaw<ChunkCounts[]>`
    SELECT
      COUNT(*) AS totalChunkCount,
      SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) AS embeddedChunkCount
    FROM PartnerContentChunk
    WHERE partnerContentItemId = ${partnerContentItemId}
  `;

  const totalChunkCount = Number(result?.totalChunkCount ?? 0);
  const embeddedChunkCount = Number(result?.embeddedChunkCount ?? 0);

  await prisma.partnerContentItem.update({
    where: {
      id: partnerContentItemId,
    },
    data: {
      totalChunkCount,
      embeddedChunkCount,
      embeddingModel: PARTNER_CONTENT_SEARCH_MODELS.embedding.id,
    },
  });

  return {
    totalChunkCount,
    embeddedChunkCount,
  };
}

// Bulk variant: recompute + write chunk counts for many items in one round-trip
// (covers items reset to 0 via the correlated subqueries).
export async function refreshPartnerContentItemChunkCountsBulk(
  partnerContentItemIds: string[],
) {
  if (partnerContentItemIds.length === 0) return;

  await prisma.$executeRaw`
    UPDATE PartnerContentItem pci
    SET
      pci.totalChunkCount = (
        SELECT COUNT(*)
        FROM PartnerContentChunk c
        WHERE c.partnerContentItemId = pci.id
      ),
      pci.embeddedChunkCount = (
        SELECT COUNT(*)
        FROM PartnerContentChunk c
        WHERE c.partnerContentItemId = pci.id
          AND c.embedding IS NOT NULL
      ),
      pci.embeddingModel = ${PARTNER_CONTENT_SEARCH_MODELS.embedding.id}
    WHERE pci.id IN (${Prisma.join(partnerContentItemIds)})
  `;
}
