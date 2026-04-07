"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { IdentityVerificationBanner } from "@/ui/partners/identity-verification/identity-verification-banner";
import { StablecoinPayoutBanner } from "@/ui/partners/payouts/stablecoin-payout-banner";
import { ProgramMarketplaceBanner } from "@/ui/partners/program-marketplace/program-marketplace-banner";

/**
 * Single promo banner slot for the programs page: identity verification when the
 * partner is not verified yet; then stablecoin payouts when available and not
 * connected; otherwise the program marketplace banner.
 */
export function ProgramsPromoBanner() {
  const { partner, availablePayoutMethods } = usePartnerProfile();

  if (!partner) {
    return null;
  }

  if (!partner.identityVerifiedAt) {
    return <IdentityVerificationBanner />;
  }

  if (
    availablePayoutMethods.includes("stablecoin") &&
    !partner.stripeRecipientId
  ) {
    return <StablecoinPayoutBanner />;
  }

  return <ProgramMarketplaceBanner />;
}
