"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { StablecoinPayoutCard } from "@/ui/partners/payouts/stablecoin-payout-card";
import { ProgramMarketplaceCard } from "@/ui/partners/program-marketplace/program-marketplace-card";

/**
 * Single promo card slot for the sidebar: show stablecoin payouts card only when
 * the partner has access to stablecoin payouts and hasn't connected stablecoin
 * yet; otherwise show the program marketplace card.
 */
export function ProgramsPromoCard() {
  const { availablePayoutMethods } = usePartnerProfile();
  const hasStablecoinAccess = availablePayoutMethods?.includes("stablecoin");

  if (hasStablecoinAccess) {
    return <StablecoinPayoutCard />;
  }

  return <ProgramMarketplaceCard />;
}
