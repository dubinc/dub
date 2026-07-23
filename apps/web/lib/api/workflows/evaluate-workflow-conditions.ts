import { WorkflowCondition } from "@/lib/types";
import type { GroupMoveCondition } from "@/lib/zod/schemas/group-move-workflows";
import { COMPARISON_OPERATORS } from "./operators";

type EvaluableCondition = WorkflowCondition | GroupMoveCondition;

export function evaluateWorkflowConditions({
  conditions,
  attributes,
}: {
  conditions: EvaluableCondition[];
  attributes: Partial<Record<string, number | string | null>>;
}): boolean {
  if (conditions.length === 0) return false;

  for (const condition of conditions) {
    const operator = COMPARISON_OPERATORS[condition.operator];

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
