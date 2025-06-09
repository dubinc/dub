import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { PartnerProps } from "../types";

export default function usePartnerProfile() {
  const { data: session, status } = useSession();
  const defaultPartnerId = session?.user?.["defaultPartnerId"];

  const {
    data: partner,
    error,
    isLoading,
    mutate,
  } = useSWR<PartnerProps>(
    defaultPartnerId && "/api/partner-profile",
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    partner,
    error,
    loading: status === "loading" || isLoading,
    mutate,
  };
}
