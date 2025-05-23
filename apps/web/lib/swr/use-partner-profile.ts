import { CONNECT_SUPPORTED_COUNTRIES, fetcher } from "@dub/utils";
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
    partner: partner
      ? {
          ...partner,
          supportedPayoutMethod:
            partner.country &&
            CONNECT_SUPPORTED_COUNTRIES.includes(partner.country)
              ? "stripe"
              : "paypal",
        }
      : undefined,
    error,
    loading: status === "loading" || isLoading,
    mutate,
  };
}
