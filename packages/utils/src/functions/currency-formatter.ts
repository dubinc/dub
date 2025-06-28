export const currencyFormatter = (
  value: number,
  options?: Intl.NumberFormatOptions,
  currency?: string,
) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
