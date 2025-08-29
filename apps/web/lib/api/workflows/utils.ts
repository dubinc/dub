import { WorkflowConditionAttribute } from "@/lib/types";

export const isCurrencyAttribute = (activity: WorkflowConditionAttribute) =>
  activity === "totalCommissions" || activity === "totalSaleAmount";
