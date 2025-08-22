import { WorkflowConditionAttribute } from "@/lib/types";

export const WORKFLOW_TRIGGER_ATTRIBUTE_LABELS = {
  totalLeads: "Leads",
  totalConversions: "Conversions",
  totalSaleAmount: "Revenue",
  totalCommission: "Commissions",
} as const;

export const isCurrencyAttribute = (activity: WorkflowConditionAttribute) =>
  activity === "totalCommission" || activity === "totalSaleAmount";
