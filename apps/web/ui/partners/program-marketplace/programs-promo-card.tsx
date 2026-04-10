"use client";

import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { IdentityVerificationCard } from "@/ui/partners/identity-verification/identity-verification-card";
import { StablecoinPayoutCard } from "@/ui/partners/payouts/stablecoin-payout-card";
import { ProgramMarketplaceCard } from "@/ui/partners/program-marketplace/program-marketplace-card";

/**
 * Single promo card slot for the sidebar: identity verification when the partner
 * is not verified yet; then stablecoin payouts when available and not connected;
 * otherwise the program marketplace card.
 */
export function ProgramsPromoCard() {
  const { partner, availablePayoutMethods } = usePartnerProfile();
  const { payoutsCount } = usePartnerPayoutsCount();

  if (!partner || !payoutsCount) {
    return null;
  }

  if (
    !partner.identityVerifiedAt &&
    partner.country !== "IN" &&
    (payoutsCount[0]?.amount ?? 0) > 10000
  ) {
    return <IdentityVerificationCard />;
  }

  if (
    availablePayoutMethods.includes("stablecoin") &&
    !partner.stripeRecipientId
  ) {
    return <StablecoinPayoutCard />;
  }

  return <ProgramMarketplaceCard />;
}
