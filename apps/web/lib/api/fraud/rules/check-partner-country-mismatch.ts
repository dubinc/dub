import { Partner } from "@prisma/client";

// Checks if the partner's physical country (from visitor fingerprint) doesn't match their profile country
export function checkPartnerCountryMismatch(
  partner: Pick<Partner, "country" | "visitorCountry">,
) {
  // If either country is missing, we can't determine a mismatch
  if (!partner.visitorCountry || !partner.country) {
    return false;
  }

  // Compare country codes (case-insensitive)
  return (
    partner.visitorCountry.toLowerCase().trim() !==
    partner.country.toLowerCase().trim()
  );
}
