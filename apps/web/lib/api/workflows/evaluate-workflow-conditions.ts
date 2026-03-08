import { WorkflowCondition, WorkflowConditionAttribute } from "@/lib/types";
import { OPERATOR_FUNCTIONS } from "@/lib/zod/schemas/workflows";

export function evaluateWorkflowConditions({
  conditions,
  attributes,
}: {
  conditions: WorkflowCondition[];
  attributes: Partial<Record<WorkflowConditionAttribute, number | null>>;
}): boolean {
  if (conditions.length === 0) return false;

  for (const condition of conditions) {
    const operatorFn = OPERATOR_FUNCTIONS[condition.operator];

    if (!operatorFn) {
      console.error(`Operator ${condition.operator} is not supported.`);
      return false;
    }

    const attributeValue = attributes[condition.attribute];

    if (attributeValue == null) {
      console.error(`${condition.attribute} doesn't exist in the context.`);
      return false;
    }

    if (!operatorFn(attributeValue, condition.value)) {
      return false;
    }
  }

  return true;
}
