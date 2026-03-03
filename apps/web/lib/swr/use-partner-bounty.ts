import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { PartnerBountyProps } from "../types";

export default function usePartnerBounty({
  bountyId,
  enabled = true,
}: {
  bountyId?: string;
  enabled?: boolean;
} = {}) {
  const params = useParams<{ programSlug: string; bountyId: string }>();
  const programSlug = params?.programSlug;
  const bountyIdParam = bountyId ?? params?.bountyId;

  const { data: bounty, isLoading, error } = useSWR<PartnerBountyProps>(
    enabled &&
      programSlug &&
      bountyIdParam &&
      `/api/partner-profile/programs/${programSlug}/bounties/${bountyIdParam}`,
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
    },
  );

  return {
    bounty,
    isLoading,
    error,
  };
}
