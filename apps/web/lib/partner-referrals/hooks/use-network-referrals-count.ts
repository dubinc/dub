import { fetcher } from "@dub/utils";
import useSWR from "swr";

export function useNetworkReferralsCount({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) {
  const { data, error } = useSWR<number>(
    enabled ? `/api/partner-profile/referrals/count` : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    data,
    error,
  };
}
