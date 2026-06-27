import { DYNADOT_DOMAIN_DEFAULT_RENEWAL_FEE_CENTS } from "./constants";

const REGISTRATION_PRICE_REGEX = /Registration Price:\s*([\d.]+)/i;
const RENEWAL_PRICE_REGEX = /Renewal price:\s*([\d.]+)/i;

// Apply 5% markup and round up to the nearest $10 (e.g. $273 → $280)
// Minimum DYNADOT_DOMAIN_DEFAULT_RENEWAL_FEE_CENTS
function calculateDomainPrice(basePriceUsd: number): number {
  const withMarkup = basePriceUsd * 1.05;
  const rounded = Math.ceil(withMarkup / 10) * 10;
  const toCents = rounded * 100;

  return Math.max(toCents, DYNADOT_DOMAIN_DEFAULT_RENEWAL_FEE_CENTS);
}

export function parseRegistrationPriceUsdCents(
  price: string | null | undefined,
): number | null {
  if (!price) return null;
  const match = price.match(REGISTRATION_PRICE_REGEX);
  return match ? calculateDomainPrice(parseFloat(match[1])) : null;
}

export function parseRenewalPriceUsdCents(
  price: string | null | undefined,
): number | null {
  if (!price) return null;
  const match = price.match(RENEWAL_PRICE_REGEX);
  return match ? calculateDomainPrice(parseFloat(match[1])) : null;
}
