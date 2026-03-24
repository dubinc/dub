"use client";

import { SocialContent } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { useEmbedToken } from "../../use-embed-token";

interface UseEmbedSocialContentParams {
  bountyId: string;
  url: string;
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
    ([requestUrl, authToken]) =>
      fetcher(requestUrl, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }),
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
