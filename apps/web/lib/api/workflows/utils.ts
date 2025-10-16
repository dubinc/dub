import { WorkflowConditionAttribute } from "@/lib/types";
import { SCHEDULED_WORKFLOW_TRIGGERS } from "@/lib/zod/schemas/workflows";
import { Workflow } from "@dub/prisma/client";
import { parseWorkflowConfig } from "./parse-workflow-config";

export const isCurrencyAttribute = (activity: WorkflowConditionAttribute) =>
  activity === "totalCommissions" || activity === "totalSaleAmount";

export const isDaysAttribute = (activity: WorkflowConditionAttribute) =>
  activity === "partnerEnrolledDays";

export const isScheduledWorkflow = (workflow: Workflow) => {
  const { condition } = parseWorkflowConfig(workflow);

  if (condition.attribute === "partnerJoined") {
    return false;
  }

  return SCHEDULED_WORKFLOW_TRIGGERS.includes(workflow.trigger);
};
