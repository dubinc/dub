"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { IdentityVerificationCard } from "@/ui/partners/identity-verification/identity-verification-card";
import { ProgramMarketplaceCard } from "@/ui/partners/program-marketplace/program-marketplace-card";

// Single promo card slot for the sidebar
export function ProgramsPromoCard() {
  const { partner } = usePartnerProfile();

  if (!partner) {
    return null;
  }

  if (
    !partner.identityVerifiedAt &&
    ["approved", "trusted"].includes(partner.networkStatus)
  ) {
    return <IdentityVerificationCard />;
  }

  return <ProgramMarketplaceCard />;
}
