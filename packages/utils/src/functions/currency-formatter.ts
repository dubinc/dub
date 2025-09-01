interface CurrencyFormatterOptions extends Intl.NumberFormatOptions {
  trailingZeroDisplay?: "auto" | "stripIfInteger";
}

export const currencyFormatter = (
  value: number,
  options?: CurrencyFormatterOptions,
) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    trailingZeroDisplay: "auto",
    ...options,
  } as CurrencyFormatterOptions).format(value);
