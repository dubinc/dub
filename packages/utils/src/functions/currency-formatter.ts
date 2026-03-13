import { isZeroDecimalCurrency } from "./currency-zero-decimal";
import { toCentsNumber } from "./to-cents-number";

interface CurrencyFormatterOptions extends Intl.NumberFormatOptions {
  trailingZeroDisplay?: "auto" | "stripIfInteger";
}

export const currencyFormatter = (
  valueInCents: number | bigint,
  options?: CurrencyFormatterOptions,
) => {
  const cents = toCentsNumber(valueInCents);
  const currency = options?.currency || "USD";
  return Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    trailingZeroDisplay: isZeroDecimalCurrency(currency)
      ? "stripIfInteger"
      : "auto",
    ...options,
  } as CurrencyFormatterOptions).format(
    isZeroDecimalCurrency(currency) ? cents : cents / 100,
  );
};
