import {
  isPartnerRevenueHidden,
  type PartnerRevenueVisibilityGroup,
} from "./is-partner-revenue-hidden";

/** Set `saleAmount` to null without mutating the original. */
export function nullSaleAmount<T extends object>(data: T): T {
  return { ...data, saleAmount: null };
}

/** Set `amount` to null without mutating the original. */
export function nullAmount<T extends object>(data: T): T {
  return { ...data, amount: null };
}

/** Null `saleAmount` when revenue data sharing is disabled. */
export function hidePartnerSaleAmount<T extends object>(
  data: T,
  group: PartnerRevenueVisibilityGroup,
): T {
  return isPartnerRevenueHidden(group) ? nullSaleAmount(data) : data;
}

/** Null `totalSaleAmount` when revenue data sharing is disabled. */
export function hidePartnerTotalSaleAmount<T extends object>(
  data: T,
  group: PartnerRevenueVisibilityGroup,
): T {
  return isPartnerRevenueHidden(group)
    ? { ...data, totalSaleAmount: null }
    : data;
}

/**
 * Null sale/revenue amounts on a partner-facing event
 * (`saleAmount`, nested `sale.amount`, and `link.saleAmount`).
 * Caller should only invoke when revenue is hidden.
 */
export function nullPartnerEventRevenue<T extends object>(event: T): T {
  const next = { ...event } as T & {
    saleAmount?: unknown;
    sale?: Record<string, unknown> | null;
    link?: object | null;
  };

  if ("saleAmount" in next) {
    next.saleAmount = null;
  }

  if (next.sale && typeof next.sale === "object") {
    next.sale = { ...next.sale, amount: null };
  }

  if (next.link && typeof next.link === "object") {
    next.link = nullSaleAmount(next.link);
  }

  return next;
}

/** Null `saleAmount` on analytics responses that include it. */
export function nullAnalyticsSaleAmounts<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map((row) =>
      row && typeof row === "object" && "saleAmount" in row
        ? nullSaleAmount(row)
        : row,
    ) as T;
  }

  if (data && typeof data === "object" && "saleAmount" in data) {
    return nullSaleAmount(data);
  }

  return data;
}
