import { WorkflowCondition } from "@/lib/api/workflows/types";
import { prettyPrint } from "@dub/utils";
import { isLocalDev } from "../environment";
import { WorkflowAttributeKey } from "./attribute-definitions";
import { WORKFLOW_OPERATORS } from "./operator-definitions";

export function evaluateWorkflowConditions({
  conditions,
  context,
}: {
  conditions: WorkflowCondition[];
  context: Partial<Record<WorkflowAttributeKey, number | string | null>>;
}): boolean {
  if (conditions.length === 0) return false;

  if (isLocalDev) {
    console.log("[Workflows] Conditions", prettyPrint(conditions));
    console.log("[Workflows] Context", prettyPrint(context));
  }

  for (const condition of conditions) {
    const operator = WORKFLOW_OPERATORS[condition.operator];

    if (!operator) {
      console.error(`Operator ${condition.operator} is not supported.`);
      return false;
    }

    const attributeValue = context[condition.attribute];

    if (attributeValue == null) {
      console.error(`${condition.attribute} doesn't exist in the context.`);
      return false;
    }

    if (condition.value == null) {
      console.error(`Value is required for ${condition.attribute}.`);
      return false;
    }

    if (!operator.evaluate(attributeValue, condition.value)) {
      return false;
    }
  }

  return true;
}
