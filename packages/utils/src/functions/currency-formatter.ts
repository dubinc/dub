export const currencyFormatter = (
  value: number,
  options?: Intl.NumberFormatOptions,
  currency?: string,
) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: 0,
    // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
    trailingZeroDisplay: "stripIfInteger",
    ...options,
  }).format(value);
