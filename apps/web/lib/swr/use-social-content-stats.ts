import { SocialContentStats } from "@/lib/types";
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
  const { data, error, isValidating } = useSWR<SocialContentStats>(
    url && programId
      ? `/api/partner-profile/programs/${programId}/bounties/social-content-stats?${new URLSearchParams(
          {
            url,
            bountyId,
          },
        ).toString()}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  return {
    data: data ?? null,
    error,
    isValidating,
  };
}
