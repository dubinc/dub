"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { StablecoinPayoutBanner } from "@/ui/partners/payouts/stablecoin-payout-banner";
import { ProgramMarketplaceBanner } from "@/ui/partners/program-marketplace/program-marketplace-banner";

/**
 * Single promo banner slot for the programs page: show stablecoin payouts banner
 * only when the partner has access to stablecoin payouts; otherwise show the
 * program marketplace banner.
 */
export function ProgramsPromoBanner() {
  const { availablePayoutMethods } = usePartnerProfile();
  const hasStablecoinAccess = availablePayoutMethods?.includes("stablecoin");

  if (hasStablecoinAccess) {
    return <StablecoinPayoutBanner />;
  }

  return <ProgramMarketplaceBanner />;
}
