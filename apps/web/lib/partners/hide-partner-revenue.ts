import {
  isPartnerRevenueHidden,
  type PartnerRevenueVisibilityGroup,
} from "./is-partner-revenue-hidden";

/** Null `saleAmount` when revenue data sharing is disabled. */
export function hidePartnerSaleAmount<T extends object>(
  data: T,
  group: PartnerRevenueVisibilityGroup,
): T {
  return isPartnerRevenueHidden(group) ? { ...data, saleAmount: null } : data;
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
export function nullifyPartnerEventRevenue<T extends object>(event: T): T {
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
    next.link = { ...next.link, saleAmount: null };
  }

  return next;
}

/** Null `saleAmount` on analytics responses that include it. */
export function nullifyAnalyticsSaleAmounts<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map((row) =>
      row && typeof row === "object" && "saleAmount" in row
        ? { ...row, saleAmount: null }
        : row,
    ) as T;
  }

  if (data && typeof data === "object" && "saleAmount" in data) {
    return { ...data, saleAmount: null };
  }

  return data;
}

/**
 * Null sale dollar amounts on partner postback payloads.
 * - sale.created: nested `sale.amount`
 * - commission.created: top-level `amount`
 */
export function nullifyPostbackRevenue(
  event: "sale.created" | "commission.created",
  data: Record<string, unknown>,
): Record<string, unknown> {
  if (event === "commission.created") {
    return { ...data, amount: null };
  }

  if (!data.sale || typeof data.sale !== "object") {
    return data;
  }

  return {
    ...data,
    sale: {
      ...(data.sale as Record<string, unknown>),
      amount: null,
    },
  };
}
