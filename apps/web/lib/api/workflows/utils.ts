import { Workflow } from "@prisma/client";
import {
  WORKFLOW_ATTRIBUTES,
  WorkflowAttributeKey,
  WorkflowDataRequirement,
} from "./attribute-definitions";
import { parseWorkflowConfig } from "./parse-workflow-config";
import { WorkflowCondition } from "./types";

export const isCurrencyAttribute = (activity: WorkflowAttributeKey) => {
  const attribute = WORKFLOW_ATTRIBUTES[activity];

  if (!attribute) {
    return false;
  }

  return attribute.inputType === "currency";
};

export const isScheduledWorkflow = (
  workflow: Pick<Workflow, "id" | "triggerConditions" | "actions">,
) => {
  const { conditions } = parseWorkflowConfig(workflow);

  return conditions.some(
    (condition) => condition.attribute === "partnerEnrolledDays",
  );
};

export function getWorkflowDataRequirements({
  conditions,
}: {
  conditions: Pick<WorkflowCondition, "attribute">[];
}): Record<WorkflowDataRequirement, boolean> {
  const requirements = new Set<WorkflowDataRequirement>();

  for (const condition of conditions) {
    const attribute = WORKFLOW_ATTRIBUTES[condition.attribute];

    if (!attribute) {
      continue;
    }

    for (const requirement of attribute.requires) {
      requirements.add(requirement);
    }
  }

  return {
    commissions: requirements.has("commissions"),
    partnerLinkStats: requirements.has("partnerLinkStats"),
  };
}
