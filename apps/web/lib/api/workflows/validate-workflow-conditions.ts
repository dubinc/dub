import { AWARD_BOUNTY_ATTRIBUTES } from "@/lib/api/workflows/award-bounty/schema";
import { GROUP_MOVE_ATTRIBUTES } from "@/lib/api/workflows/move-group/schema";
import { WORKFLOW_OPERATORS } from "@/lib/api/workflows/operator-definitions";
import { SEND_CAMPAIGN_ATTRIBUTES } from "@/lib/api/workflows/send-campaign/schema";
import type { WorkflowType } from "@/lib/api/workflows/types";
import { DubApiError } from "../errors";

// Map of workflow type to its attributes
const WORKFLOW_TYPE_ATTRIBUTES = {
  awardBounty: AWARD_BOUNTY_ATTRIBUTES,
  sendCampaign: SEND_CAMPAIGN_ATTRIBUTES,
  moveGroup: GROUP_MOVE_ATTRIBUTES,
} as const satisfies Record<
  WorkflowType,
  Record<string, { operators: readonly string[] }>
>;

type WorkflowConditionInput = {
  attribute: string;
  operator: string;
  value: unknown;
};

export async function validateWorkflowConditions({
  conditions,
  workflowType,
}: {
  conditions?: WorkflowConditionInput[] | null;
  workflowType: WorkflowType;
}): Promise<void> {
  if (!conditions || conditions.length === 0) {
    return;
  }

  const attributes = WORKFLOW_TYPE_ATTRIBUTES[workflowType];

  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    const conditionIndex = i;

    if (!condition.attribute) {
      throw new DubApiError({
        code: "bad_request",
        message: `Condition ${conditionIndex + 1}: Please select an activity.`,
      });
    }

    // Find the attribute definition
    const attributeDefinition =
      attributes[condition.attribute as keyof typeof attributes];

    if (!attributeDefinition) {
      throw new DubApiError({
        code: "bad_request",
        message: `Condition ${conditionIndex + 1}: Invalid activity.`,
      });
    }

    // Find the operator definition
    const operatorDefinition =
      WORKFLOW_OPERATORS[condition.operator as keyof typeof WORKFLOW_OPERATORS];

    if (!operatorDefinition) {
      throw new DubApiError({
        code: "bad_request",
        message: `Condition ${conditionIndex + 1}: Invalid operator.`,
      });
    }

    if (
      !(attributeDefinition.operators as readonly string[]).includes(
        condition.operator,
      )
    ) {
      const operatorLabel = operatorDefinition?.label ?? condition.operator;

      throw new DubApiError({
        code: "bad_request",
        message: `Operator "${operatorLabel}" is not valid for the activity "${condition.attribute}".`,
      });
    }

    if (condition.value == null || condition.value === undefined) {
      throw new DubApiError({
        code: "bad_request",
        message: `Condition ${conditionIndex + 1}: Please enter a value.`,
      });
    }

    try {
      operatorDefinition.validate(condition.value as any);
    } catch (error) {
      throw new DubApiError({
        code: "bad_request",
        message: `Condition ${conditionIndex + 1}: ${error instanceof Error ? error.message : "Invalid value."}`,
      });
    }
  }
}
