/**
 * Dub's track-sale API expects `amount` in minor units (e.g. cents for USD).
 * AppsFlyer postbacks usually send revenue in major units with a decimal (e.g. "0.52").
 * If the param string contains ".", treat as major units and convert to cents.
 * Otherwise treat as already in minor units (e.g. "2900" cents).
 */
export function appsflyerAmountToDubCents(
  amount: string | undefined,
): number | undefined {
  if (amount == null) {
    return undefined;
  }
  const trimmed = amount.trim();
  if (trimmed === "") {
    return undefined;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return undefined;
  }
  if (trimmed.includes(".")) {
    return Math.round(n * 100);
  }
  return Math.round(n);
}
