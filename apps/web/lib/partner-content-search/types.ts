import type { PlatformType } from "@prisma/client";

export const PARTNER_CONTENT_SEARCH_PLATFORMS = [
  "youtube",
  "instagram",
  "tiktok",
] as const satisfies readonly PlatformType[];

export type PartnerContentPlatform =
  (typeof PARTNER_CONTENT_SEARCH_PLATFORMS)[number];

const PARTNER_CONTENT_SEARCH_PLATFORM_SET = new Set<string>(
  PARTNER_CONTENT_SEARCH_PLATFORMS,
);

export function isPartnerContentSearchPlatform(
  platform: string | null | undefined,
): platform is PartnerContentPlatform {
  return Boolean(platform && PARTNER_CONTENT_SEARCH_PLATFORM_SET.has(platform));
}

export type VoyageInputType = "document" | "query";

export type TranscriptSegment = {
  text: string;
  startMs?: number | null;
  endMs?: number | null;
};

export type SentenceTimestamp = {
  text: string;
  startMs: number | null;
  endMs: number | null;
  segmentIndex: number;
};

export type TranscriptChunk = {
  chunkIndex: number;
  text: string;
  tokenEstimate: number;
  startMs: number | null;
  endMs: number | null;
  sentenceTimestamps: SentenceTimestamp[];
};

export type ChunkTranscriptOptions = {
  minTokens?: number;
  maxTokens?: number;
  overlapTokens?: number;
};

export type VoyageEmbeddingMetadata = {
  provider: "voyage";
  model: string;
  dimensions: number;
  inputType: VoyageInputType;
};

export type VoyageRerankResult = {
  index: number;
  relevanceScore: number;
  document?: string;
};
