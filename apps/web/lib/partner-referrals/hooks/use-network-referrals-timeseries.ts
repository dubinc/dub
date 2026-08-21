import { NetworkReferralsTimeseries } from "@/lib/partner-referrals/types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";

export function useNetworkReferralsTimeseries({
  enabled = true,
  interval = "1y",
}: {
  enabled?: boolean;
  interval?: string;
} = {}) {
  const searchParams = new URLSearchParams({
    interval,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const { data, error, isLoading } = useSWR<NetworkReferralsTimeseries[]>(
    enabled
      ? `/api/partner-profile/referrals/timeseries?${searchParams.toString()}`
      : null,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
    },
  );

  return {
    data,
    error,
    isLoading,
  };
}
