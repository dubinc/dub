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

  const platformsVerified = partner?.platforms?.length
    ? Object.fromEntries(
        partner.platforms.map((p) => [p.type, p.verifiedAt != null]),
      )
    : undefined;

  return {
    partner,
    platformsVerified,
    payoutMethod: partner?.country
      ? PAYPAL_SUPPORTED_COUNTRIES.includes(partner.country)
        ? "paypal"
        : CONNECT_SUPPORTED_COUNTRIES.includes(partner.country)
          ? "stripe"
          : undefined
      : undefined,
    error,
    loading: status === "loading" || isLoading,
    mutate,
  };
}
