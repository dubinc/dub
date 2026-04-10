"use client";

import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
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
  const { payoutsCount } = usePartnerPayoutsCount();

  if (!partner || !payoutsCount) {
    return null;
  }

  if (
    !partner.identityVerifiedAt &&
    partner.country !== "IN" &&
    (payoutsCount[0]?.amount ?? 0) > 10000
  ) {
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
