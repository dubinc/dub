import {
  CONNECT_SUPPORTED_COUNTRIES,
  fetcher,
  PAYPAL_SUPPORTED_COUNTRIES,
} from "@dub/utils";
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
      keepPreviousData: true,
    },
  );

  return {
    partner,
    payoutMethod: partner?.country
      ? partner.country in PAYPAL_SUPPORTED_COUNTRIES
        ? "paypal"
        : partner.country in CONNECT_SUPPORTED_COUNTRIES
          ? "stripe"
          : undefined
      : undefined,
    error,
    loading: status === "loading" || isLoading,
    mutate,
  };
}
