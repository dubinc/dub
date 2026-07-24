import { WorkflowCondition } from "@/lib/api/workflows/types";
import { WorkflowAttributeKey } from "./attribute-definitions";
import { WORKFLOW_OPERATORS } from "./operator-definitions";

export function evaluateWorkflowConditions({
  conditions,
  attributes,
}: {
  conditions: WorkflowCondition[];
  attributes: Partial<Record<WorkflowAttributeKey, number | null>>;
}): boolean {
  if (conditions.length === 0) return false;

  for (const condition of conditions) {
    const operator = WORKFLOW_OPERATORS[condition.operator];

    if (!operator) {
      console.error(`Operator ${condition.operator} is not supported.`);
      return false;
    }

    const attributeValue = attributes[condition.attribute];

    if (attributeValue == null) {
      console.error(`${condition.attribute} doesn't exist in the context.`);
      return false;
    }

    if (!operator.evaluate(attributeValue, condition.value)) {
      return false;
    }
  }

  return true;
}
