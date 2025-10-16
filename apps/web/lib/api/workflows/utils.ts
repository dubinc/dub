import { WorkflowConditionAttribute } from "@/lib/types";
import { Workflow } from "@dub/prisma/client";
import { parseWorkflowConfig } from "./parse-workflow-config";

export const isCurrencyAttribute = (activity: WorkflowConditionAttribute) =>
  activity === "totalCommissions" || activity === "totalSaleAmount";

export const isDaysAttribute = (activity: WorkflowConditionAttribute) =>
  activity === "partnerEnrolledDays";

export const isScheduledWorkflow = (workflow: Workflow) => {
  const workflowAttributes: WorkflowConditionAttribute[] = [
    "partnerEnrolledDays",
    "totalClicks",
    "totalCommissions",
  ];

  const { condition } = parseWorkflowConfig(workflow);

  return workflowAttributes.includes(condition.attribute);
};
