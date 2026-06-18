// Shared helpers for the partner content search routes (admin + network).
// Both routes run the same raw vector query and group rows by partner; only the
// per-chunk shape differs, so each route passes its own `toChunkResult` mapper.

export type PartnerContentSearchRow = {
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
  chunkSource: string;
  // Only the admin query selects chunkIndex; the network query omits it.
  chunkIndex?: number;
  chunkText: string;
  startMs: number | null;
  endMs: number | null;
  distance: number | string;
};

export function toScore(distance: number) {
  return Number((1 - distance).toFixed(6));
}

export function groupPartnerSearchResults<TChunk>({
  rows,
  limit,
  chunksPerPartner,
  toChunkResult,
}: {
  rows: PartnerContentSearchRow[];
  limit: number;
  chunksPerPartner: number;
  toChunkResult: (row: PartnerContentSearchRow, distance: number) => TChunk;
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
      chunks: TChunk[];
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
      chunks: [] as TChunk[],
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
