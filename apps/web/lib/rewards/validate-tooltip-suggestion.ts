import {
  TOOLTIP_SUGGESTION_CONFIDENCE_FLOOR,
  type ReviewRewardTooltipModifier,
  type TooltipSuggestion,
  type TooltipSuggestionPatch,
} from "@/lib/ai/review-reward-tooltip-schema";
import {
  CONDITION_OPERATORS,
  DATE_CONDITION_OPERATORS,
  ENUM_CONDITION_OPERATORS,
  METADATA_CONDITION_OPERATORS,
  METADATA_NUMBER_CONDITION_OPERATORS,
  NUMBER_CONDITION_OPERATORS,
  REWARD_CONDITIONS,
  STRING_CONDITION_OPERATORS,
  type RewardConditionEntityAttribute,
} from "@/lib/zod/schemas/rewards";
import { EventType } from "@prisma/client";

type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

export function getRewardConditionAttribute({
  event,
  entity,
  attribute,
}: {
  event: EventType;
  entity?: string;
  attribute?: string;
}): RewardConditionEntityAttribute | undefined {
  if (!entity || !attribute) return undefined;

  return REWARD_CONDITIONS[event].entities
    .find((entry) => entry.id === entity)
    ?.attributes.find((entry) => entry.id === attribute);
}

export function isRewardConditionComplete({
  event,
  condition,
}: {
  event: EventType;
  condition?: {
    entity?: string;
    attribute?: string;
    operator?: string;
    value?: unknown;
    metadataField?: string;
  } | null;
}): boolean {
  if (
    !condition?.entity ||
    !condition.attribute ||
    !condition.operator ||
    !getRewardConditionAttribute({
      event,
      entity: condition.entity,
      attribute: condition.attribute,
    })
  ) {
    return false;
  }

  if (condition.attribute === "metadata" && !condition.metadataField?.trim()) {
    return false;
  }

  return isConditionValueFilled(condition.value);
}

export function applyTooltipSuggestion<
  T extends { operator?: ConditionOperator; value?: unknown },
>(condition: T, suggested: TooltipSuggestionPatch): T {
  return {
    ...condition,
    ...(suggested.operator ? { operator: suggested.operator } : {}),
    ...(suggested.value !== undefined ? { value: suggested.value } : {}),
  };
}

export function suggestionTouchesField({
  field,
  current,
  suggested,
}: {
  field: "operator" | "value";
  current: { operator?: ConditionOperator; value?: unknown };
  suggested: TooltipSuggestionPatch;
}): boolean {
  if (field === "operator") {
    return (
      suggested.operator != null && suggested.operator !== current.operator
    );
  }

  return (
    suggested.value !== undefined &&
    !valuesEqual(suggested.value, current.value)
  );
}

export function filterValidatedTooltipSuggestions({
  event,
  modifiers,
  suggestions,
}: {
  event: EventType;
  modifiers: ReviewRewardTooltipModifier[];
  suggestions: TooltipSuggestion[];
}): TooltipSuggestion[] {
  const byCondition = new Map<string, TooltipSuggestion>();

  for (const suggestion of suggestions) {
    if (!isValidTooltipSuggestion({ event, modifiers, suggestion })) {
      continue;
    }

    const key = `${suggestion.modifierIndex}:${suggestion.conditionIndex}`;
    const existing = byCondition.get(key);

    if (!existing || suggestion.confidence > existing.confidence) {
      byCondition.set(key, suggestion);
    }
  }

  return [...byCondition.values()];
}

function isValidTooltipSuggestion({
  event,
  modifiers,
  suggestion,
}: {
  event: EventType;
  modifiers: ReviewRewardTooltipModifier[];
  suggestion: TooltipSuggestion;
}): boolean {
  if (
    typeof suggestion.confidence !== "number" ||
    Number.isNaN(suggestion.confidence) ||
    suggestion.confidence < TOOLTIP_SUGGESTION_CONFIDENCE_FLOOR
  ) {
    return false;
  }

  if (!suggestion.reason?.trim()) {
    return false;
  }

  if (
    suggestion.suggested.operator == null &&
    suggestion.suggested.value === undefined
  ) {
    return false;
  }

  const current =
    modifiers[suggestion.modifierIndex]?.conditions[suggestion.conditionIndex];

  if (!current) {
    return false;
  }

  const nextOperator = suggestion.suggested.operator ?? current.operator;
  const allowedOperators = getAllowedOperators({
    event,
    entity: current.entity,
    attribute: current.attribute,
  });

  if (!allowedOperators.includes(nextOperator)) {
    return false;
  }

  const nextValue =
    suggestion.suggested.value !== undefined
      ? suggestion.suggested.value
      : current.value;

  if (
    !isValueValidForOperator({
      event,
      entity: current.entity,
      attribute: current.attribute,
      operator: nextOperator,
      value: nextValue,
    })
  ) {
    return false;
  }

  return (
    nextOperator !== current.operator || !valuesEqual(nextValue, current.value)
  );
}

function getAllowedOperators({
  event,
  entity,
  attribute,
}: {
  event: EventType;
  entity?: string;
  attribute?: string;
}): ConditionOperator[] {
  if (
    (entity === "customer" && attribute === "source") ||
    (entity === "sale" && attribute === "type")
  ) {
    return ["equals_to"];
  }

  const attributeType =
    getRewardConditionAttribute({ event, entity, attribute })?.type ?? "string";

  if (attributeType === "metadata") {
    return [...METADATA_CONDITION_OPERATORS];
  }

  if (attributeType === "number" || attributeType === "currency") {
    return [...NUMBER_CONDITION_OPERATORS];
  }

  if (attributeType === "enum") {
    return [...ENUM_CONDITION_OPERATORS];
  }

  if (attributeType === "date") {
    return [...DATE_CONDITION_OPERATORS];
  }

  return [...STRING_CONDITION_OPERATORS];
}

function isConditionValueFilled(value: unknown): boolean {
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.filter(Boolean).length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  return true;
}

function isValueValidForOperator({
  event,
  entity,
  attribute,
  operator,
  value,
}: {
  event: EventType;
  entity: string;
  attribute: string;
  operator: ConditionOperator;
  value: unknown;
}): boolean {
  if (!isConditionValueFilled(value)) {
    return false;
  }

  if (operator === "in" || operator === "not_in") {
    return Array.isArray(value);
  }

  if (Array.isArray(value)) {
    return false;
  }

  const attributeType =
    getRewardConditionAttribute({ event, entity, attribute })?.type ?? "string";

  const numeric =
    attributeType === "number" ||
    attributeType === "currency" ||
    attributeType === "date" ||
    (attributeType === "metadata" &&
      METADATA_NUMBER_CONDITION_OPERATORS.includes(operator));

  if (numeric) {
    return typeof value === "number" && !Number.isNaN(value);
  }

  return typeof value === "string";
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((item, index) => item === right[index])
    );
  }

  return left === right;
}

export function stripRewardTooltipMarkdown(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#+\s+/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
