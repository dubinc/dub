export const PERFORMANCE_BOUNTY_SCOPE_ATTRIBUTES: Record<
  "totalLeads" | "totalConversions" | "totalSaleAmount" | "totalCommissions",
  string
> = {
  totalLeads: "Leads",
  totalConversions: "Conversions",
  totalSaleAmount: "Revenue",
  totalCommissions: "Commissions",
} as const;
