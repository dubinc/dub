import {
  RewardCondition,
  RewardConditions,
  RewardConditionsArray,
  RewardContext,
} from "../types";
import { getRewardAmount } from "./get-reward-amount";

export const evaluateRewardConditions = ({
  conditions,
  context,
}: {
  conditions: RewardConditionsArray;
  context: RewardContext;
}) => {
  if (!conditions || !context) {
    return null;
  }

  const matchingConditions: RewardConditions[] = [];

  for (const conditionGroup of conditions) {
    // Evaluate each condition in the group
    const conditionResults = conditionGroup.conditions.map((condition) => {
      let fieldValue = undefined;

      if (condition.entity === "customer") {
        fieldValue = context.customer?.[condition.attribute];
      } else if (condition.entity === "sale") {
        fieldValue = context.sale?.[condition.attribute];
      } else if (condition.entity === "partner") {
        fieldValue = context.partner?.[condition.attribute];
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

    if (conditionsMet) {
      matchingConditions.push(conditionGroup);
    }
  }

  if (matchingConditions.length === 0) {
    return null;
  }

  // Find the best matching condition (highest amount)
  return matchingConditions.sort(
    (a, b) =>
      getRewardAmount({
        type: b.type!,
        amountInCents: b.amountInCents,
        amountInPercentage: b.amountInPercentage,
      }) -
      getRewardAmount({
        type: a.type!,
        amountInCents: a.amountInCents,
        amountInPercentage: a.amountInPercentage,
      }),
  )[0];
};

const evaluateCondition = ({
  condition,
  fieldValue,
}: {
  condition: RewardCondition;
  fieldValue: string | number | string[] | number[];
}) => {
  // Equals
  if (condition.operator === "equals_to") {
    return fieldValue === condition.value;
  }

  // Not equals
  if (condition.operator === "not_equals") {
    return fieldValue !== condition.value;
  }

  // Starts with
  if (condition.operator === "starts_with") {
    if (typeof fieldValue !== "string" || typeof condition.value !== "string") {
      return false;
    }

    return fieldValue.startsWith(condition.value);
  }

  // Ends with
  if (condition.operator === "ends_with") {
    if (typeof fieldValue !== "string" || typeof condition.value !== "string") {
      return false;
    }

    return fieldValue.endsWith(condition.value);
  }

  // In
  if (condition.operator === "in") {
    if (!Array.isArray(condition.value)) {
      return false;
    }

    return (condition.value as (string | number)[]).includes(
      fieldValue as string | number,
    );
  }

  // Not in
  if (condition.operator === "not_in") {
    if (!Array.isArray(condition.value)) {
      return false;
    }

    return !(condition.value as (string | number)[]).includes(
      fieldValue as string | number,
    );
  }

  // Greater than
  if (condition.operator === "greater_than") {
    return Number(fieldValue) > Number(condition.value);
  }

  // Greater than or equal
  if (condition.operator === "greater_than_or_equal") {
    return Number(fieldValue) >= Number(condition.value);
  }

  // Less than
  if (condition.operator === "less_than") {
    return Number(fieldValue) < Number(condition.value);
  }

  // Less than or equal
  if (condition.operator === "less_than_or_equal") {
    return Number(fieldValue) <= Number(condition.value);
  }

  return false;
};
