import { fetcher } from "@dub/utils";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { getPayoutMethodsForCountry } from "../partners/get-payout-methods-for-country";
import { PartnerBetaFeatures, PartnerProps } from "../types";

interface PartnerProfile extends PartnerProps {
  featureFlags?: Record<PartnerBetaFeatures, boolean>;
}

export default function usePartnerProfile() {
  const { data: session, status } = useSession();
  const defaultPartnerId = session?.user?.["defaultPartnerId"];

  const {
    data: partner,
    error,
    isLoading,
    mutate,
  } = useSWR<PartnerProfile>(
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

  const availablePayoutMethods = getPayoutMethodsForCountry({
    country: partner?.country,
    stablecoinEnabled: Boolean(partner?.featureFlags?.stablecoin),
  });

  return {
    partner,
    platformsVerified,
    error,
    loading: status === "loading" || isLoading,
    mutate,
    availablePayoutMethods,
  };
}
