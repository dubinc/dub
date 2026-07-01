import type { ReachTier } from "@/lib/api/network/reach-tiers";
import {
  PARTNER_CONTENT_SEARCH_DEFAULT_CHUNKS_PER_PARTNER,
  PARTNER_CONTENT_SEARCH_PARTNER_LIMIT,
} from "@/lib/partner-content-search/constants";
import type {
  PartnerContentMatchEvidence,
  PartnerContentMatchSource,
  PartnerNetworkContentSearchPartner,
  PartnerNetworkContentSearchResponse,
} from "@/lib/zod/schemas/partner-network";
import type { PlatformType } from "@prisma/client";
import useSWR from "swr";
import { useDebounce } from "use-debounce";
import useWorkspace from "./use-workspace";

// Derived from the response schema (single source of truth in partner-network.ts)
// and re-exported under these names so existing consumers keep importing them here.
export type { PartnerContentMatchEvidence, PartnerContentMatchSource };
export type PartnerContentSearchPartner = PartnerNetworkContentSearchPartner;
export type PartnerContentSearchResponse = PartnerNetworkContentSearchResponse;

export default function usePartnerContentSearch({
  enabled,
  query,
  platforms,
  reach,
  country,
  starred,
  partnerIds,
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
          limit,
          chunksPerPartner,
        ])
      : null;
  const [debouncedKeySignature] = useDebounce(keySignature, debounceMs);

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<PartnerContentSearchResponse>(
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

  // True from the moment the inputs change — while the fetch key is still
  // debouncing AND during the request itself — so the UI can show a loading
  // state immediately instead of after the debounce settles.
  const isPending = keySignature !== debouncedKeySignature || isValidating;

  return { data, error, isLoading, isPending, mutate };
}
