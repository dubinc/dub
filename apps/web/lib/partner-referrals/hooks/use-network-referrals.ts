import { useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { NetworkReferralProps } from "../types";

export function useNetworkReferrals({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const { getQueryString } = useRouterStuff();

  const { data, isLoading, error } = useSWR<NetworkReferralProps[]>(
    enabled ? `/api/partner-profile/referrals${getQueryString()}` : null,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    data,
    isLoading,
    error,
  };
}
