import { WORKFLOW_OPERATORS } from "@/lib/api/workflows/operator-definitions";
import type { WorkflowType } from "@/lib/api/workflows/types";
import { DubApiError } from "../errors";
import {
  WORKFLOW_ATTRIBUTE_VALIDATORS,
  type WorkflowAttributeValidatorContext,
} from "./attribute-validators";
import { SEND_CAMPAIGN_ATTRIBUTES } from "./send-campaign/schema";
import { isExclusiveWorkflowAttribute } from "./utils";
import { WORKFLOW_TYPE_ATTRIBUTES } from "./workflow-type-attributes";

type WorkflowConditionInput = {
  attribute: string;
  operator: string;
  value?: unknown;
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
  // Award bounty workflows require exactly one condition
  if (
    workflowType === "awardBounty" &&
    (!conditions || conditions.length !== 1)
  ) {
    throw new DubApiError({
      code: "bad_request",
      message: "Award bounty workflows require exactly one condition.",
    });
  }

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

  if (workflowType === "sendCampaign") {
    const attributesUsed = conditions
      .map((condition) => condition.attribute)
      .filter(Boolean);

    if (new Set(attributesUsed).size !== attributesUsed.length) {
      throw new DubApiError({
        code: "bad_request",
        message: "Each activity can only be used once in the campaign logic.",
      });
    }

    const exclusiveUsed = attributesUsed.filter((attr) =>
      isExclusiveWorkflowAttribute(attr, SEND_CAMPAIGN_ATTRIBUTES),
    );

    if (exclusiveUsed.length > 0 && attributesUsed.length > 1) {
      throw new DubApiError({
        code: "bad_request",
        message: `Campaign logic with "${SEND_CAMPAIGN_ATTRIBUTES[exclusiveUsed[0]].label}" cannot include other conditions.`,
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

    // Some conditions (inputType "none", e.g. partnerJoined) don't require a value.
    if (attributeDefinition.inputType !== "none") {
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
          message: `Condition ${conditionIndex + 1}: ${
            error instanceof Error ? error.message : "Invalid value."
          }`,
        });
      }
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
