import { RewardCondition } from "@/lib/types";
import {
  METADATA_CONDITION_OPERATORS,
  METADATA_NUMBER_CONDITION_OPERATORS,
} from "@/lib/zod/schemas/rewards";

function toNumber(fieldKey: unknown): number | undefined {
  if (fieldKey == null) {
    return undefined;
  }

  if (typeof fieldKey === "number" && !Number.isNaN(fieldKey)) {
    return fieldKey;
  }

  if (typeof fieldKey === "boolean") {
    return undefined;
  }

  if (Array.isArray(fieldKey)) {
    return undefined;
  }

  if (typeof fieldKey === "string") {
    if (fieldKey.trim() === "" || Number.isNaN(Number(fieldKey))) {
      return undefined;
    }

    return Number(fieldKey);
  }

  const n = Number(fieldKey);
  return Number.isNaN(n) ? undefined : n;
}

function toString(fieldKey: unknown) {
  return typeof fieldKey === "string" ? fieldKey : String(fieldKey);
}

/**
 * Normalizes a raw metadata value (from lead/sale JSON) into the type that
 * `evaluateCondition` expects for the given operator.
 *
 * Metadata is stored as loosely typed JSON, so the same field may arrive as a
 * string, number, or other primitive. Text operators (starts_with, contains,
 * etc.) always receive a string; numeric operators receive a parsed number or
 * undefined when parsing fails. For equals_to / not_equals, the return type is
 * aligned with `condition.value` so strict equality checks compare like types.
 */
export function prepareMetadataFieldValue(
  fieldKey: unknown,
  condition: RewardCondition,
): string | number | string[] | number[] | undefined {
  if (fieldKey == null) {
    return undefined;
  }

  const { operator, value: conditionValue } = condition;

  // Metadata conditions do not support in / not_in and other non-metadata operators.
  if (!METADATA_CONDITION_OPERATORS.includes(operator)) {
    return undefined;
  }

  // Pattern text operators always compare against a stringified metadata value.
  if (
    operator === "starts_with" ||
    operator === "ends_with" ||
    operator === "contains" ||
    operator === "not_contains"
  ) {
    return toString(fieldKey);
  }

  // Numeric operators require a parsed number, or undefined when coercion fails.
  if (METADATA_NUMBER_CONDITION_OPERATORS.includes(operator)) {
    return toNumber(fieldKey);
  }

  // For equals_to / not_equals with a numeric condition value, prefer number coercion.
  if (typeof conditionValue === "number") {
    const numeric = toNumber(fieldKey);
    return numeric !== undefined ? numeric : toString(fieldKey);
  }

  // All other operators use string comparison.
  return toString(fieldKey);
}
