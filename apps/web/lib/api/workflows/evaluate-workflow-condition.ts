import { WorkflowCondition, WorkflowConditionAttribute } from "@/lib/types";
import { OPERATOR_FUNCTIONS } from "@/lib/zod/schemas/workflows";

export function evaluateWorkflowCondition({
  condition,
  attributes,
}: {
  condition: WorkflowCondition;
  attributes: Partial<Record<WorkflowConditionAttribute, number | null>>;
}) {
  console.log("Evaluating the workflow condition:", {
    condition,
    attributes,
  });

  const operatorFn = OPERATOR_FUNCTIONS[condition.operator];

  if (!operatorFn) {
    throw new Error(
      `Operator ${condition.operator} is not supported in the workflow trigger condition.`,
    );
  }

  const attributeValue = attributes[condition.attribute];

  // If the attribute is not provided in context, return false
  if (attributeValue === undefined || attributeValue === null) {
    console.error(`${condition.attribute} doesn't exist in the context.`);
    return false;
  }

  return operatorFn(attributeValue, condition.value);
}
