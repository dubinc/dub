import { isZeroDecimalCurrency } from "./currency-zero-decimal";

interface CurrencyFormatterOptions extends Intl.NumberFormatOptions {
  trailingZeroDisplay?: "auto" | "stripIfInteger";
}

export const currencyFormatter = (
  valueInCents: number,
  options?: CurrencyFormatterOptions,
) => {
  const currency = options?.currency || "USD";
  return Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    trailingZeroDisplay: isZeroDecimalCurrency(currency)
      ? "stripIfInteger"
      : "auto",
    ...options,
  } as CurrencyFormatterOptions).format(
    isZeroDecimalCurrency(currency) ? valueInCents : valueInCents / 100,
  );
};
