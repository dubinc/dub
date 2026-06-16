import {
  RewardCondition,
  RewardConditions,
  RewardConditionsArray,
  RewardContext,
} from "../types";
import {
  METADATA_NUMBER_CONDITION_OPERATORS,
  METADATA_TEXT_CONDITION_OPERATORS,
} from "../zod/schemas/rewards";
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
      const fieldValue = resolveConditionFieldValue({
        condition,
        context,
      });

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

  return undefined;
}

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

    if (condition.value === "") return false;

    return fieldValue.startsWith(condition.value);
  }

  // Ends with
  if (condition.operator === "ends_with") {
    if (typeof fieldValue !== "string" || typeof condition.value !== "string") {
      return false;
    }

    if (condition.value === "") return false;

    return fieldValue.endsWith(condition.value);
  }

  // Contains
  if (condition.operator === "contains") {
    if (typeof fieldValue !== "string" || typeof condition.value !== "string") {
      return false;
    }

    const needle = condition.value.trim();
    if (needle === "") return false;

    return String(fieldValue).includes(needle);
  }

  // Not contains
  if (condition.operator === "not_contains") {
    if (typeof fieldValue !== "string" || typeof condition.value !== "string") {
      return false;
    }

    const needle = condition.value.trim();
    if (needle === "") return false;

    return !String(fieldValue).includes(needle);
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
    if (!Array.isArray(condition.value) || condition.value.length === 0) {
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

function parseMetadataNumeric(raw: unknown): number | undefined {
  if (raw == null) {
    return undefined;
  }

  if (typeof raw === "number" && !Number.isNaN(raw)) {
    return raw;
  }

  if (typeof raw === "string") {
    if (raw.trim() === "" || Number.isNaN(Number(raw))) {
      return undefined;
    }

    return Number(raw);
  }

  if (typeof raw === "boolean") {
    return undefined;
  }

  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

function metadataRawToString(raw: unknown): string {
  return typeof raw === "string" ? raw : String(raw);
}

function prepareMetadataFieldValue(
  raw: unknown,
  condition: RewardCondition,
): string | number | string[] | number[] | undefined {
  if (raw == null) return undefined;

  const op = condition.operator;
  const equalsOrNot = op === "equals_to" || op === "not_equals";

  if (METADATA_TEXT_CONDITION_OPERATORS.includes(op) && !equalsOrNot) {
    return metadataRawToString(raw);
  }

  const ordering = METADATA_NUMBER_CONDITION_OPERATORS.includes(op);
  if (!ordering && !equalsOrNot) return undefined;

  const numeric = parseMetadataNumeric(raw);
  if (ordering) return numeric;

  // For equals_to / not_equals, match the coercion to condition.value's type
  // so that strict === in evaluateCondition sees the same type on both sides.
  if (typeof condition.value === "number") {
    return numeric !== undefined ? numeric : metadataRawToString(raw);
  }

  return metadataRawToString(raw);
}
