import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
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

  return {
    bounties,
    isLoading,
    error,
  };
}
