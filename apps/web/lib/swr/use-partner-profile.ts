import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { PartnerProps } from "../types";

export default function usePartnerProfile() {
  const { partnerId } = useParams();

  const { data: partner, error } = useSWR<PartnerProps>(
    `/api/partners/${partnerId}`,
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    partner,
    error,
    loading: partnerId && !partner && !error ? true : false,
  };
}
