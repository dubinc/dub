import { AWARD_BOUNTY_ATTRIBUTES } from "@/lib/api/workflows/award-bounty/schema";
import { GROUP_MOVE_ATTRIBUTES } from "@/lib/api/workflows/move-group/schema";
import { WORKFLOW_OPERATORS } from "@/lib/api/workflows/operator-definitions";
import { SEND_CAMPAIGN_ATTRIBUTES } from "@/lib/api/workflows/send-campaign/schema";
import type { WorkflowType } from "@/lib/api/workflows/types";
import { DubApiError } from "../errors";
import {
  WORKFLOW_ATTRIBUTE_VALIDATORS,
  type WorkflowAttributeValidatorContext,
} from "./attribute-validators";

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
  context,
}: {
  conditions?: WorkflowConditionInput[] | null;
  workflowType: WorkflowType;
  context?: WorkflowAttributeValidatorContext;
}): Promise<void> {
  if (!conditions || conditions.length === 0) {
    return;
  }

  // Move group workflow requires at least one metric condition and one partner group condition
  if (workflowType === "moveGroup") {
    const hasPartnerGroup = conditions.some(
      (condition) => condition.attribute === "partnerGroup",
    );

    const hasMetricCondition = conditions.some(
      (condition) =>
        condition.attribute && condition.attribute !== "partnerGroup",
    );

    if (hasPartnerGroup && !hasMetricCondition) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Partner group can only be used as an additional condition alongside a metric rule.",
      });
    }
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

    const attributeValidator =
      WORKFLOW_ATTRIBUTE_VALIDATORS[condition.attribute];

    if (attributeValidator && context) {
      try {
        await attributeValidator({
          value: condition.value,
          operator: condition.operator,
          context,
        });
      } catch (error) {
        if (error instanceof DubApiError) {
          throw new DubApiError({
            code: error.code,
            message: `Condition ${conditionIndex + 1}: ${error.message}`,
          });
        }

        throw new DubApiError({
          code: "bad_request",
          message: `Condition ${conditionIndex + 1}: ${error instanceof Error ? error.message : "Invalid value."}`,
        });
      }
    }
  }
}
