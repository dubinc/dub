import {
  PARTNER_CONTENT_SEARCH_DEFAULT_CHUNKS_PER_PARTNER,
  PARTNER_CONTENT_SEARCH_PARTNER_LIMIT,
} from "@/lib/partner-content-search/constants";
import type { PlatformType } from "@prisma/client";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export type PartnerContentSearchPartner = {
  partnerId: string;
  name: string;
  username: string | null;
  image: string | null;
  description: string | null;
  score: number;
  chunks: {
    chunkId: string;
    platform: {
      type: string;
      identifier: string;
    };
    content: {
      platformContentId: string;
      url: string;
      title: string | null;
      thumbnailUrl: string | null;
      publishedAt: string | null;
    };
    chunk: {
      source: "metadata" | "transcript" | string;
      text: string;
      startMs: number | null;
      endMs: number | null;
    };
    score: number;
  }[];
};

export type PartnerContentSearchResponse = {
  success: boolean;
  partners: PartnerContentSearchPartner[];
};

export default function usePartnerContentSearch({
  enabled,
  query,
  platform,
  starred,
}: {
  enabled: boolean;
  query: string;
  platform: PlatformType;
  starred: boolean;
}) {
  const { id: workspaceId } = useWorkspace();

  const { data, error, isLoading } = useSWR<PartnerContentSearchResponse>(
    enabled && workspaceId
      ? ["partner-content-search", workspaceId, query, platform, starred]
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
            limit: PARTNER_CONTENT_SEARCH_PARTNER_LIMIT,
            chunksPerPartner: PARTNER_CONTENT_SEARCH_DEFAULT_CHUNKS_PER_PARTNER,
            platform,
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

  return { data, error, isLoading };
}
