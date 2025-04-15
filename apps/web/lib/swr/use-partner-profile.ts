import { CONNECT_SUPPORTED_COUNTRIES, fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { PartnerProps, PayoutMethod } from "../types";

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

  const payoutMethod = partner?.stripeConnectId
    ? "stripe"
    : partner?.paypalEmail
      ? "paypal"
      : null;

  const supportedPayoutMethod = partner?.country
    ? CONNECT_SUPPORTED_COUNTRIES.includes(partner.country)
      ? "stripe"
      : "paypal"
    : null;

  return {
    partner: {
      ...(partner as PartnerProps),
      payoutMethod: payoutMethod as PayoutMethod | null,
      supportedPayoutMethod: supportedPayoutMethod as PayoutMethod | null,
    },
    error,
    loading: status === "loading" || isLoading,
    mutate,
  };
}
