import { LinkProps } from "../types";

export function aggregatePartnerLinksStats(
  links?:
    | Pick<
        LinkProps,
        "clicks" | "leads" | "conversions" | "sales" | "saleAmount"
      >[]
    | null,
) {
  if (!links || links.length === 0) {
    return {
      totalClicks: 0,
      totalLeads: 0,
      totalConversions: 0,
      totalSales: 0,
      totalSaleAmount: 0,
    };
  }

  return links.reduce(
    (acc, link) => {
      acc.totalClicks += link.clicks;
      acc.totalLeads += link.leads;
      acc.totalConversions += link.conversions;
      acc.totalSales += link.sales;
      acc.totalSaleAmount += link.saleAmount;
      return acc;
    },
    {
      totalClicks: 0,
      totalLeads: 0,
      totalConversions: 0,
      totalSales: 0,
      totalSaleAmount: 0,
    },
  );
}
