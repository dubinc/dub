import { NetworkReferralsStats } from "@/lib/partner-referrals/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";

export function useNetworkReferralsStats({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const { data, error, isLoading } = useSWR<NetworkReferralsStats>(
    enabled ? `/api/partner-profile/referrals/stats` : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    data,
    error,
    isLoading,
  };
}
