import { fetcher } from "@dub/utils";
import { useMemo } from "react";
import useSWR from "swr";
import { countPartnerBountiesByTab } from "../bounty/partner-bounty-tabs";
import { PartnerProfileBountyProps } from "../types";

// the partner bounties of all active programs, or of one program
export function usePartnerProfileBounties({
  programIdOrSlug,
  enabled = true,
}: {
  programIdOrSlug?: string;
  enabled?: boolean;
} = {}) {
  const {
    data: bounties,
    isLoading,
    error,
  } = useSWR<PartnerProfileBountyProps[]>(
    enabled &&
      `/api/partner-profile/bounties${
        programIdOrSlug
          ? `?${new URLSearchParams({ programIdOrSlug }).toString()}`
          : ""
      }`,
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
