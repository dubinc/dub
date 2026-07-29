import { Workflow } from "@prisma/client";
import { WorkflowAttributeKey } from "./attribute-definitions";
import { parseWorkflowConfig } from "./parse-workflow-config";

export const isCurrencyAttribute = (activity: WorkflowAttributeKey) =>
  activity === "totalCommissions" || activity === "totalSaleAmount";

export const isScheduledWorkflow = (
  workflow: Pick<Workflow, "id" | "triggerConditions" | "actions">,
) => {
  const { conditions } = parseWorkflowConfig(workflow);

  return conditions.some(
    (condition) => condition.attribute === "partnerEnrolledDays",
  );
};
