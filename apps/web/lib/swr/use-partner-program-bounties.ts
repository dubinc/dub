import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import { PartnerBountyProps } from "../types";

export default function usePartnerProgramBounties({
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

  const bountiesCount = useMemo(() => {
    if (!bounties) return { active: 0, expired: 0 };
    return bounties.reduce(
      (counts, bounty) => {
        const isExpired = bounty.endsAt && new Date(bounty.endsAt) < new Date();
        counts[isExpired ? "expired" : "active"]++;
        return counts;
      },
      { active: 0, expired: 0 },
    );
  }, [bounties]);

  return {
    bounties,
    bountiesCount,
    isLoading,
    error,
  };
}
