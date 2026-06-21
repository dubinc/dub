import type { ReachTier } from "@/lib/api/network/reach-tiers";
import {
  PARTNER_CONTENT_SEARCH_DEFAULT_CHUNKS_PER_PARTNER,
  PARTNER_CONTENT_SEARCH_PARTNER_LIMIT,
  type PartnerContentTopicFitBand,
} from "@/lib/partner-content-search/constants";
import type { NetworkPartnerProps } from "@/lib/types";
import type { PlatformType } from "@prisma/client";
import useSWR from "swr";
import { useDebounce } from "use-debounce";
import useWorkspace from "./use-workspace";

export type PartnerContentMatchSource = "transcript" | "creatorText";

export type PartnerContentMatchEvidence = {
  primarySource: PartnerContentMatchSource | null;
  sources: PartnerContentMatchSource[];
  transcriptScore: number | null;
  creatorTextScore: number | null;
  creatorTextWeight: number;
  weight: number;
};

export type PartnerContentSearchPartner = {
  partnerId: string;
  name: string;
  username: string | null;
  image: string | null;
  description: string | null;
  score: number;
  // Debug comparison for validating reranker impact against raw vector search.
  cosineScore?: number | null;
  rerankScore?: number | null;
  partner: NetworkPartnerProps;
  chunks: {
    chunkId: string;
    partnerContentItemId: string;
    platform: {
      type: string;
      identifier: string;
    };
    content: {
      platformContentId: string;
      url: string;
      type: string;
      title: string | null;
      description: string | null;
      thumbnailUrl: string | null;
      publishedAt: string | null;
      durationMs: number | null;
    };
    chunk: {
      source: "metadata" | "transcript" | string;
      text: string;
      startMs: number | null;
      endMs: number | null;
    };
    score: number;
    cosineScore?: number;
    rerankScore?: number | null;
    matchEvidence?: PartnerContentMatchEvidence;
  }[];
  matchSummary: {
    matchedContentCount: number;
    transcriptMatchedContentCount: number;
    creatorTextMatchedContentCount: number;
    creatorTextOnlyContentCount: number;
    weightedMatchedContentCount: number;
    weightedMatchedContentScore: number;
    recentContentCount: number;
    totalContentCount: number;
    // Aggregate card score (0-100) + its coverage-based band, and the partner's
    // platforms ranked by matched-post frequency.
    topicFit: number;
    band: PartnerContentTopicFitBand;
    topPlatforms: string[];
    // Brand-facing reach/activity signals over the on-topic posts.
    followers: number | null;
    medianViews: number | null;
    lastOnTopicAt: string | null;
    platforms: string[];
    sources: string[];
    oldestPublishedAt: string | null;
    newestPublishedAt: string | null;
    contentBars: {
      partnerContentItemId: string;
      platform: string;
      platformContentId: string;
      title: string | null;
      url: string | null;
      durationMs: number | null;
      publishedAt: string | null;
      viewCount: number | null;
      matched: boolean;
      matchScore: number | null;
      matchEvidence: PartnerContentMatchEvidence;
    }[];
  } | null;
};

export type PartnerContentSearchResponse = {
  success: boolean;
  reranked?: boolean;
  partners: PartnerContentSearchPartner[];
};

export default function usePartnerContentSearch({
  enabled,
  query,
  platforms,
  reach,
  country,
  starred,
  partnerIds,
  candidateChunkCount,
  limit = PARTNER_CONTENT_SEARCH_PARTNER_LIMIT,
  chunksPerPartner = PARTNER_CONTENT_SEARCH_DEFAULT_CHUNKS_PER_PARTNER,
  debounceMs = 0,
}: {
  enabled: boolean;
  query: string;
  platforms?: PlatformType[];
  reach?: ReachTier[];
  country?: string;
  starred: boolean;
  partnerIds?: string[];
  candidateChunkCount?: number;
  limit?: number;
  chunksPerPartner?: number;
  // Coalesce rapid filter changes into one request. Voyage search is billed and
  // ~seconds, so callers driving it from fast-changing filters pass a small delay.
  debounceMs?: number;
}) {
  const { id: workspaceId } = useWorkspace();

  // Stable string signature (not a fresh array each render) so the debounce timer
  // only resets when the inputs actually change. The fetcher below reads the live
  // values; by the time the debounced key settles they equal this signature.
  const keySignature =
    enabled && workspaceId
      ? JSON.stringify([
          workspaceId,
          query,
          platforms?.join(",") ?? "",
          reach?.join(",") ?? "",
          country,
          starred,
          partnerIds?.join(",") ?? "",
          candidateChunkCount,
          limit,
          chunksPerPartner,
        ])
      : null;
  const [debouncedKeySignature] = useDebounce(keySignature, debounceMs);

  const { data, error, isLoading, mutate } = useSWR<PartnerContentSearchResponse>(
    debouncedKeySignature
      ? ["partner-content-search", debouncedKeySignature]
      : null,
    // The shared `fetcher` from @dub/utils is GET-only; this endpoint takes a
    // POST body, so it needs its own fetcher.
    async () => {
      const response = await fetch(
        `/api/network/partners/content-search?workspaceId=${workspaceId}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit,
            chunksPerPartner,
            ...(candidateChunkCount && { candidateChunkCount }),
            ...(platforms?.length && { platforms }),
            ...(reach?.length && { reach }),
            ...(country && { country }),
            ...(partnerIds?.length && { partnerIds }),
            starred: starred || undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to search partner content");
      }

      return response.json();
    },
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      dedupingInterval: 20000,
    },
  );

  return { data, error, isLoading, mutate };
}
