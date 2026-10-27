import { workflowConditionsSchema } from "@/lib/zod/schemas/workflows";
import { Workflow } from "@prisma/client";
import {
  WORKFLOW_ATTRIBUTES,
  WorkflowAttributeKey,
  WorkflowDataRequirement,
} from "./attribute-definitions";
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
  const parsed = workflowConditionsSchema.safeParse(workflow.triggerConditions);

  if (!parsed.success || parsed.data.length === 0) {
    return false;
  }

  return parsed.data.some((condition) => {
    const attribute = WORKFLOW_ATTRIBUTES[condition.attribute];

    return attribute?.scheduled === true;
  });
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

function isExclusiveAttributeDefinition(
  definition: unknown,
): definition is { exclusive: true } {
  return (
    typeof definition === "object" &&
    definition != null &&
    "exclusive" in definition &&
    (definition as { exclusive?: boolean }).exclusive === true
  );
}

export function isExclusiveWorkflowAttribute(
  attribute: string,
  attributes: Record<string, unknown>,
): boolean {
  return isExclusiveAttributeDefinition(attributes[attribute]);
}

// Enforces exclusive-attribute combination rules for workflow conditions.
// Exclusive attributes (e.g. partnerJoined) must be the sole condition.
export function satisfiesExclusiveAttributeRules<T extends string>({
  attribute,
  usedAttributes,
  currentAttribute,
  attributes,
}: {
  attribute: T;
  usedAttributes: T[];
  currentAttribute?: T;
  attributes: Record<string, unknown>;
}): boolean {
  if (attribute === currentAttribute) {
    return true;
  }

  if (usedAttributes.includes(attribute)) {
    return false;
  }

  const otherUsedAttributes = usedAttributes.filter(
    (used) => used !== currentAttribute,
  );

  if (
    isExclusiveWorkflowAttribute(attribute, attributes) &&
    otherUsedAttributes.length > 0
  ) {
    return false;
  }

  if (
    !isExclusiveWorkflowAttribute(attribute, attributes) &&
    otherUsedAttributes.some((used) =>
      isExclusiveWorkflowAttribute(used, attributes),
    )
  ) {
    return false;
  }

  return true;
}
