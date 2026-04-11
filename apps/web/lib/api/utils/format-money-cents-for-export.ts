import { currencyFormatter } from "@dub/utils";

/**
 * Formats cents for CSV export using the same rules as the dashboard (`currencyFormatter`).
 * Intl.NumberFormat throws RangeError for invalid ISO currency codes; callers may pass free-form DB strings.
 */
export function formatMoneyCentsForExport(
  cents: number,
  currency: string | null | undefined,
  contextId: string,
): string {
  const code = (currency ?? "").trim() || "USD";
  try {
    return currencyFormatter(cents, { currency: code });
  } catch (error) {
    const isRangeError = error instanceof RangeError;
    console.warn(
      `[formatMoneyCentsForExport] currency format failed for ${contextId} (currency=${JSON.stringify(currency)}, isRangeError=${isRangeError}); falling back.`,
      error,
    );
    try {
      return currencyFormatter(cents, { currency: "USD" });
    } catch {
      const safe = Number.isFinite(cents) ? cents : 0;
      return (safe / 100).toFixed(2);
    }
  }
}
