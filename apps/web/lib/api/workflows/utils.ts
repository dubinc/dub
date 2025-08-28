import { WorkflowConditionAttribute } from "@/lib/types";

export const isCurrencyAttribute = (activity: WorkflowConditionAttribute) =>
  activity === "totalCommission" || activity === "totalSaleAmount";
