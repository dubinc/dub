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
      const fieldValue = resolveConditionFieldValue({ condition, context });

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

function resolveConditionFieldValue({
  condition,
  context,
}: {
  condition: RewardCondition;
  context: RewardContext;
}): string | number | string[] | number[] | undefined {
  if (condition.attribute === "metadata") {
    const metaKey = condition.metadataField?.trim() ?? "";
    if (!metaKey) return undefined;

    if (condition.entity === "lead") {
      const raw = context.lead?.metadata?.[metaKey];
      return prepareMetadataFieldValue(raw, condition);
    }

    if (condition.entity === "sale") {
      const raw = context.sale?.metadata?.[metaKey];
      return prepareMetadataFieldValue(raw, condition);
    }

    return undefined;
  }

  if (condition.entity === "customer") {
    return context.customer?.[condition.attribute];
  }
  if (condition.entity === "sale") {
    return context.sale?.[condition.attribute];
  }
  if (condition.entity === "partner") {
    return context.partner?.[condition.attribute];
  }
  if (condition.entity === "lead") {
    return undefined;
  }

  return undefined;
}

function prepareMetadataFieldValue(
  raw: unknown,
  condition: RewardCondition,
): string | number | string[] | number[] | undefined {
  if (raw == null) {
    return undefined;
  }
  const op = condition.operator;

  const textOperators = [
    "equals_to",
    "not_equals",
    "starts_with",
    "ends_with",
    "in",
    "not_in",
  ];
  const numberOperators = [
    "greater_than",
    "greater_than_or_equal",
    "less_than",
    "less_than_or_equal",
  ];

  if (numberOperators.includes(op)) {
    if (typeof raw === "number" && !Number.isNaN(raw)) {
      return raw;
    }

    if (
      typeof raw === "string" &&
      raw.trim() !== "" &&
      !Number.isNaN(Number(raw))
    ) {
      return Number(raw);
    }

    if (typeof raw === "boolean") {
      return Number(raw);
    }

    if (typeof raw === "string" && raw.trim() === "") {
      return undefined;
    }

    const n = Number(raw);
    return Number.isNaN(n) ? undefined : n;
  }

  if (textOperators.includes(op)) {
    return typeof raw === "string" ? raw : String(raw);
  }

  return undefined;
}

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
    case "greater_than":
      return Number(fieldValue) > Number(condition.value);
    case "greater_than_or_equal":
      return Number(fieldValue) >= Number(condition.value);
    case "less_than":
      return Number(fieldValue) < Number(condition.value);
    case "less_than_or_equal":
      return Number(fieldValue) <= Number(condition.value);
    default:
      return false;
  }
};
