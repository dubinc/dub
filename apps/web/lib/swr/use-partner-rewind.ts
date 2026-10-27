import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { PartnerRewindProps } from "../types";

export default function usePartnerRewind() {
  const { data: session, status } = useSession();
  const defaultPartnerId = session?.user?.["defaultPartnerId"];

  const {
    data: partnerRewind,
    error,
    isLoading,
    mutate,
  } = useSWR<PartnerRewindProps>(
    defaultPartnerId && "/api/partner-profile/rewind",
    fetcher,
    {
      dedupingInterval: 60000,
      keepPreviousData: true,
      shouldRetryOnError: (err) => err.status !== 404,
    },
  );

  return {
    partnerRewind,
    error,
    loading: status === "loading" || isLoading,
    mutate,
  };
}
