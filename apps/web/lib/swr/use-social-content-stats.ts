import { SocialContent } from "@/lib/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";

interface UseSocialContentStatsParams {
  programId: string | undefined;
  bountyId: string;
  url: string;
}

export default function useSocialContentStats({
  programId,
  bountyId,
  url,
}: UseSocialContentStatsParams) {
  const searchParams = new URLSearchParams({
    url,
    bountyId,
  });

  const { data, error, isValidating, mutate } = useSWR<SocialContent>(
    url && programId
      ? `/api/partner-profile/programs/${programId}/bounties/social-content-stats?${searchParams.toString()}`
      : null,
    fetcher,
  );

  return {
    data: data ?? null,
    error,
    isValidating,
    mutate,
  };
}
