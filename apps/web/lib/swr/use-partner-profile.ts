import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { PartnerProps } from "../types";

export default function usePartnerProfile() {
  const { data: session } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const { data: partner, error } = useSWR<PartnerProps>(
    partnerId && `/api/partners/${partnerId}`,
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
