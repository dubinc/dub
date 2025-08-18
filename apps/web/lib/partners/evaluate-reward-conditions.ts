import { Reward } from "@prisma/client";
import {
  RewardCondition,
  RewardConditionsArray,
  RewardContext,
} from "../types";

export const evaluateRewardConditions = ({
  conditions,
  context,
}: {
  conditions: RewardConditionsArray;
  context: RewardContext;
}): Pick<Reward, "amount" | "type"> | null => {
  if (!conditions || !context) {
    return null;
  }

  for (const conditionGroup of conditions) {
    // Evaluate each condition in the group
    const conditionResults = conditionGroup.conditions.map((condition) => {
      let fieldValue = undefined;

      if (condition.entity === "customer") {
        fieldValue = context.customer?.[condition.attribute];
      } else if (condition.entity === "sale") {
        fieldValue = context.sale?.[condition.attribute];
      }

      if (fieldValue === undefined) {
        return false;
      }

      return evaluateCondition({
        condition,
        fieldValue,
      });
    });

    // Apply the operator logic to the condition results
    let conditionsMet = false;
    if (conditionGroup.operator === "AND") {
      conditionsMet = conditionResults.every((result) => result);
    } else if (conditionGroup.operator === "OR") {
      conditionsMet = conditionResults.some((result) => result);
    }

    // If this condition group matches, return it
    if (conditionsMet) {
      return {
        amount: conditionGroup.amount,
        type: conditionGroup.type,
      };
    }
  }

  return null;
};

const evaluateCondition = ({
  condition,
  fieldValue,
}: {
  condition: RewardCondition;
  fieldValue: string | number | string[] | number[];
}) => {
  switch (condition.operator) {
    case "equals_to":
      return fieldValue === condition.value;
    case "not_equals":
      return fieldValue !== condition.value;
    case "starts_with":
      if (
        typeof fieldValue === "string" &&
        typeof condition.value === "string"
      ) {
        return fieldValue.startsWith(condition.value);
      }
      return false;
    case "ends_with":
      if (
        typeof fieldValue === "string" &&
        typeof condition.value === "string"
      ) {
        return fieldValue.endsWith(condition.value);
      }
      return false;
    case "in":
      if (Array.isArray(condition.value)) {
        return (condition.value as (string | number)[]).includes(
          fieldValue as string | number,
        );
      }
      return false;
    case "not_in":
      if (Array.isArray(condition.value)) {
        return !(condition.value as (string | number)[]).includes(
          fieldValue as string | number,
        );
      }
      return true;
    default:
      return false;
  }
};
