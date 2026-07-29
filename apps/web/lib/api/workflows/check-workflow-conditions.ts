import { WORKFLOW_OPERATORS } from "@/lib/api/workflows/operator-definitions";
import type {
  WorkflowCondition,
  WorkflowType,
} from "@/lib/api/workflows/types";
import { WORKFLOW_TYPE_ATTRIBUTES } from "./workflow-type-attributes";

export type WorkflowConditionCheckResult = {
  valid: boolean;
  errors: string[];
};

export function checkWorkflowConditions({
  conditions,
  workflowType,
}: {
  conditions?: WorkflowCondition[] | null;
  workflowType: WorkflowType;
}): WorkflowConditionCheckResult {
  if (!conditions || conditions.length === 0) {
    return {
      valid: true,
      errors: [],
    };
  }

  const attributes = WORKFLOW_TYPE_ATTRIBUTES[workflowType];
  const errors: string[] = [];

  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    const conditionIndex = i;

    if (!condition?.attribute) {
      errors.push(
        `Condition ${conditionIndex + 1}: Please select an activity.`,
      );
      continue;
    }

    const attributeDefinition =
      attributes[condition.attribute as keyof typeof attributes];

    if (!attributeDefinition) {
      errors.push(`Condition ${conditionIndex + 1}: Invalid activity.`);
      continue;
    }

    const operatorDefinition =
      WORKFLOW_OPERATORS[condition.operator as keyof typeof WORKFLOW_OPERATORS];

    if (!operatorDefinition) {
      errors.push(`Condition ${conditionIndex + 1}: Invalid operator.`);
      continue;
    }

    if (
      !(attributeDefinition.operators as readonly string[]).includes(
        condition.operator,
      )
    ) {
      const operatorLabel = operatorDefinition.label ?? condition.operator;
      errors.push(
        `Operator "${operatorLabel}" is not valid for the activity "${condition.attribute}".`,
      );
      continue;
    }

    // Attributes with inputType "none" (e.g. partnerJoined) don't require a value.
    if (attributeDefinition.inputType === "none") {
      continue;
    }

    if (condition.value == null || condition.value === undefined) {
      errors.push(`Condition ${conditionIndex + 1}: Please enter a value.`);
      continue;
    }

    try {
      operatorDefinition.validate(condition.value as any);
    } catch (error) {
      errors.push(
        `Condition ${conditionIndex + 1}: ${
          error instanceof Error ? error.message : "Invalid value."
        }`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
