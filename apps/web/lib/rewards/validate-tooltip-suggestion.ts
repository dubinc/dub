import {
  TOOLTIP_SUGGESTION_CONFIDENCE_FLOOR,
  type PayoutFix,
  type ReviewRewardTooltipModifier,
  type RewardPayout,
  type TooltipSuggestion,
  type TooltipSuggestionPatch,
} from "@/lib/ai/review-reward-tooltip-schema";
import {
  CONDITION_OPERATORS,
  DATE_CONDITION_OPERATORS,
  ENUM_CONDITION_OPERATORS,
  isOneOffRewardEvent,
  METADATA_CONDITION_OPERATORS,
  METADATA_NUMBER_CONDITION_OPERATORS,
  NUMBER_CONDITION_OPERATORS,
  REWARD_CONDITIONS,
  STRING_CONDITION_OPERATORS,
  type RewardConditionEntityAttribute,
} from "@/lib/zod/schemas/rewards";
import { COUNTRIES } from "@dub/utils";
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

export type TooltipSuggestionField = "operator" | "value";

type TooltipSuggestionPage = {
  suggestion: TooltipSuggestion;
  field: TooltipSuggestionField;
};

export function getTooltipSuggestionPages({
  suggestions,
  modifiers,
}: {
  suggestions: TooltipSuggestion[];
  modifiers: Array<{
    conditions: Array<{ operator?: ConditionOperator; value?: unknown }>;
  }>;
}): TooltipSuggestionPage[] {
  const pages: TooltipSuggestionPage[] = [];

  for (const suggestion of suggestions) {
    const current =
      modifiers[suggestion.modifierIndex]?.conditions[
        suggestion.conditionIndex
      ];

    if (!current) continue;

    if (
      suggestionTouchesField({
        field: "operator",
        current,
        suggested: suggestion.suggested,
      })
    ) {
      pages.push({ suggestion, field: "operator" });
    }

    if (
      suggestionTouchesField({
        field: "value",
        current,
        suggested: suggestion.suggested,
      })
    ) {
      pages.push({ suggestion, field: "value" });
    }
  }

  return pages;
}

export function suggestionTouchesField({
  field,
  current,
  suggested,
}: {
  field: TooltipSuggestionField;
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

export function filterPayoutFixes({
  event,
  basePayout,
  modifiers,
  fixes,
}: {
  event?: EventType;
  basePayout: RewardPayout;
  modifiers: ReviewRewardTooltipModifier[];
  fixes: PayoutFix[];
}): PayoutFix[] {
  const byTarget = new Map<string, PayoutFix>();

  for (const fix of fixes) {
    if (
      typeof fix.confidence !== "number" ||
      fix.confidence < TOOLTIP_SUGGESTION_CONFIDENCE_FLOOR ||
      !fix.reason?.trim()
    ) {
      continue;
    }

    const current =
      fix.scope === "default"
        ? basePayout
        : modifiers[fix.modifierIndex ?? -1]?.payout;

    if (!current) continue;
    if (fix.scope === "group" && typeof fix.modifierIndex !== "number") {
      continue;
    }

    // Amounts are in dollars; these mirror the save schema limits.
    const maxAmount = current.type === "percentage" ? 100 : 999_999.99;
    if (typeof fix.amount === "number" && fix.amount > maxAmount) continue;

    const fixDuration =
      event && isOneOffRewardEvent(event) ? undefined : fix.maxDuration;
    const nextDuration =
      fixDuration === undefined ? current.maxDuration : fixDuration;
    const amountChanges =
      typeof fix.amount === "number" && fix.amount !== current.amount;
    const durationChanges =
      fixDuration !== undefined && nextDuration !== current.maxDuration;

    if (!amountChanges && !durationChanges) continue;

    const key =
      fix.scope === "default" ? "default" : `group:${fix.modifierIndex}`;
    const existing = byTarget.get(key);

    if (!existing || fix.confidence > existing.confidence) {
      byTarget.set(key, {
        ...fix,
        reason: fix.reason.trim(),
        amount: amountChanges ? fix.amount : null,
        maxDuration: durationChanges ? nextDuration : undefined,
      });
    }
  }

  return [...byTarget.values()];
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
  const isFixedOperator =
    (current.entity === "customer" && current.attribute === "source") ||
    (current.entity === "sale" && current.attribute === "type");
  const allowedOperators: ConditionOperator[] = isFixedOperator
    ? ["equals_to"]
    : getConditionOperators(
        getRewardConditionAttribute({
          event,
          entity: current.entity,
          attribute: current.attribute,
        })?.type ?? "string",
      );

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

export function getConditionOperators(
  attributeType: string,
): ConditionOperator[] {
  if (attributeType === "metadata") return METADATA_CONDITION_OPERATORS;
  if (attributeType === "number" || attributeType === "currency") {
    return NUMBER_CONDITION_OPERATORS;
  }
  if (attributeType === "enum") return ENUM_CONDITION_OPERATORS;
  if (attributeType === "date") return DATE_CONDITION_OPERATORS;
  return STRING_CONDITION_OPERATORS;
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

  const attributeEntry = getRewardConditionAttribute({
    event,
    entity,
    attribute,
  });
  const allowedValues =
    attributeEntry?.options?.map(({ id }) => id) ??
    (attributeEntry?.id === "country" ? Object.keys(COUNTRIES) : undefined);
  const isAllowedValue = (item: unknown) =>
    typeof item === "string" &&
    (!allowedValues || allowedValues.includes(item));

  if (operator === "in" || operator === "not_in") {
    return Array.isArray(value) && value.every(isAllowedValue);
  }

  if (Array.isArray(value)) {
    return false;
  }

  const attributeType = attributeEntry?.type ?? "string";

  const numeric =
    attributeType === "number" ||
    attributeType === "currency" ||
    attributeType === "date" ||
    (attributeType === "metadata" &&
      METADATA_NUMBER_CONDITION_OPERATORS.includes(operator));

  if (numeric) {
    return typeof value === "number" && !Number.isNaN(value);
  }

  return isAllowedValue(value);
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
