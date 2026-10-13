import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import { countPartnerBountiesByTab } from "../bounty/partner-bounty-tabs";
import { PartnerBountyProps } from "../types";

export function usePartnerProgramBounties({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) {
  const { programSlug } = useParams();

  const {
    data: bounties,
    isLoading,
    error,
  } = useSWR<PartnerBountyProps[]>(
    enabled &&
      programSlug &&
      `/api/partner-profile/programs/${programSlug}/bounties`,
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
