import { fetcher } from "@dub/utils";
import { useMemo } from "react";
import useSWR from "swr";
import { countPartnerBountiesByTab } from "../bounty/partner-bounty-tabs";
import { PartnerProfileBountyProps } from "../types";

// the partner bounties of all approved programs
export function usePartnerProfileBounties({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) {
  const {
    data: bounties,
    isLoading,
    error,
  } = useSWR<PartnerProfileBountyProps[]>(
    enabled && "/api/partner-profile/bounties",
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
    },
  );

  const bountiesCount = useMemo(
    () => countPartnerBountiesByTab(bounties),
    [bounties],
  );

  return {
    bounties,
    bountiesCount,
    isLoading,
    error,
  };
}
