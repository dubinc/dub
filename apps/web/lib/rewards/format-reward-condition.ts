import { RewardCondition, RewardConditions, RewardProps } from "@/lib/types";
import {
  CONDITION_OPERATOR_LABELS,
  REWARD_CONDITIONS,
} from "@/lib/zod/schemas/rewards";
import {
  COUNTRIES,
  capitalize,
  currencyFormatter,
  formatDateTime,
} from "@dub/utils";
import { formatDuration } from "date-fns";

export function formatRewardConditionParts({
  condition,
  event,
}: {
  condition: RewardCondition;
  event: RewardProps["event"];
}) {
  const entity = REWARD_CONDITIONS[event].entities.find(
    (e) => e.id === condition.entity,
  );
  const attribute = entity?.attributes?.find(
    (a) => a.id === condition.attribute,
  );

  const attributeLabel =
    (condition.entity === "lead" || condition.entity === "sale") &&
    condition.attribute === "metadata" &&
    condition.metadataField?.trim()
      ? `"${condition.metadataField.trim()}"`
      : capitalize(attribute?.label);

  const operatorLabel = condition.label
    ? "is"
    : CONDITION_OPERATOR_LABELS[condition.operator];

  return {
    entityLabel: capitalize(condition.entity),
    attributeLabel: attributeLabel ?? "",
    operatorLabel,
    valueLabel: formatRewardConditionValue({ condition, attribute }),
  };
}

export function formatRewardConditionClause({
  condition,
  event,
  operator,
  isFirst,
}: {
  condition: RewardCondition;
  event: RewardProps["event"];
  operator: RewardConditions["operator"];
  isFirst: boolean;
}): string {
  const { entityLabel, attributeLabel, operatorLabel, valueLabel } =
    formatRewardConditionParts({ condition, event });

  return [
    isFirst ? "if" : operator.toLowerCase(),
    entityLabel,
    attributeLabel,
    operatorLabel,
    valueLabel,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatRewardConditionValue({
  condition,
  attribute,
}: {
  condition: RewardCondition;
  attribute:
    | {
        type: string;
        options?: { id: string; label: string }[];
      }
    | undefined;
}): string {
  if (condition.value == null || condition.value === "") {
    return "";
  }

  if (condition.attribute === "country") {
    if (Array.isArray(condition.value)) {
      return (condition.value as (string | number)[])
        .map((v) => COUNTRIES[v?.toString()] ?? v)
        .join(", ");
    }

    return COUNTRIES[condition.value?.toString()] ?? condition.value.toString();
  }

  if (condition.attribute === "subscriptionDurationMonths") {
    return formatSubscriptionDuration(Number(condition.value));
  }

  if (condition.attribute === "productId" && condition.label?.trim()) {
    return condition.label.trim();
  }

  if (Array.isArray(condition.value)) {
    return (
      attribute?.options
        ? (condition.value as (string | number)[]).map(
            (v) => attribute.options?.find((o) => o.id === v)?.label ?? v,
          )
        : condition.value
    ).join(", ");
  }

  if (attribute?.type === "currency") {
    return currencyFormatter(Number(condition.value));
  }

  if (attribute?.type === "date") {
    return formatDateTime(new Date(Number(condition.value)));
  }

  if (attribute?.options) {
    return (
      attribute.options.find((o) => o.id === condition.value)?.label ??
      condition.value.toString()
    );
  }

  return condition.value.toString();
}

function formatSubscriptionDuration(v: number): string {
  return formatDuration(
    v >= 12 ? { years: Math.floor(v / 12), months: v % 12 } : { months: v },
  );
}
