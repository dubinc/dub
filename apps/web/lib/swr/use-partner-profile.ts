import { CONNECT_SUPPORTED_COUNTRIES, fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { PartnerProps } from "../types";

export default function usePartnerProfile() {
  const { data: session, status } = useSession();
  const partnerId = session?.user?.["defaultPartnerId"];

  const [isPartnerPage, setIsPartnerPage] = useState(false);

  useEffect(() => {
    setIsPartnerPage(window.location.hostname.startsWith("partners"));
  }, []);

  const {
    data: partner,
    error,
    isLoading,
    mutate,
  } = useSWR<PartnerProps>(
    isPartnerPage && partnerId && "/api/partner-profile",
    fetcher,
    {
      dedupingInterval: 60000,
    },
  );

  return {
    partner: partner
      ? {
          ...partner,
          supportedPayoutMethod: CONNECT_SUPPORTED_COUNTRIES.includes(
            partner.country || "US",
          )
            ? "stripe"
            : "paypal",
        }
      : undefined,
    error,
    loading: status === "loading" || isLoading,
    mutate,
  };
}
