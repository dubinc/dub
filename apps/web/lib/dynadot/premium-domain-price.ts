const REGISTRATION_PRICE_REGEX = /Registration Price:\s*([\d.]+)/i;
const RENEWAL_PRICE_REGEX = /Renewal price:\s*([\d.]+)/i;

export function parseDynadotRegistrationPriceUsd(
  price: string | null | undefined,
): number | null {
  if (!price) return null;
  const match = price.match(REGISTRATION_PRICE_REGEX);
  return match ? parseFloat(match[1]) : null;
}

export function parseDynadotRenewalPriceUsd(
  price: string | null | undefined,
): number | null {
  if (!price) return null;
  const match = price.match(RENEWAL_PRICE_REGEX);
  return match ? parseFloat(match[1]) : null;
}

/** Apply 4% markup and round up to the nearest $10 (e.g. $273 → $280). */
export function calculatePremiumDomainPriceUsd(basePriceUsd: number): number {
  const withMarkup = basePriceUsd * 1.04;
  return Math.ceil(withMarkup / 10) * 10;
}

export function calculatePremiumDomainPriceCents(basePriceUsd: number): number {
  return calculatePremiumDomainPriceUsd(basePriceUsd) * 100;
}
