"use client";

import usePartnerPayoutsCount from "@/lib/swr/use-partner-payouts-count";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { IdentityVerificationBanner } from "@/ui/partners/identity-verification/identity-verification-banner";
import { ProgramMarketplaceBanner } from "@/ui/partners/program-marketplace/program-marketplace-banner";

// Single promo banner slot for the programs page
export function ProgramsPromoBanner() {
  const { partner } = usePartnerProfile();
  const { payoutsCount } = usePartnerPayoutsCount();

  if (!partner || !payoutsCount) {
    return null;
  }

  if (
    !partner.identityVerifiedAt &&
    ["approved", "trusted"].includes(partner.networkStatus)
  ) {
    return <IdentityVerificationBanner />;
  }

  return <ProgramMarketplaceBanner />;
}
