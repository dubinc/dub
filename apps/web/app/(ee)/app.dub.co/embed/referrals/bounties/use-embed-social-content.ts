"use client";

import { SocialContent } from "@/lib/types";
import useSWR from "swr";
import { useEmbedToken } from "../../use-embed-token";

interface UseEmbedSocialContentParams {
  bountyId: string;
  url: string;
}

async function fetchEmbedSocialContent(
  endpoint: string,
  token: string,
): Promise<SocialContent> {
  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const message =
      (await res.json().catch(() => null))?.error?.message ??
      "Failed to fetch social content.";
    throw new Error(message);
  }

  return res.json();
}

export function useEmbedSocialContent({
  bountyId,
  url,
}: UseEmbedSocialContentParams) {
  const token = useEmbedToken();

  const searchParams = new URLSearchParams({
    url,
  });

  const { data, error, isValidating, mutate } = useSWR<SocialContent>(
    token && bountyId && url
      ? [
          `/api/embed/referrals/bounties/${bountyId}/social-content-stats?${searchParams.toString()}`,
          token,
        ]
      : null,
    ([requestUrl, authToken]) => fetchEmbedSocialContent(requestUrl, authToken),
    {
      revalidateOnFocus: false,
    },
  );

  return {
    data: data ?? null,
    error,
    isValidating,
    mutate,
  };
}
