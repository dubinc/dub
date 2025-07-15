import { Prisma } from "@dub/prisma/client";
import { z } from "zod";
import {
  rewardConditionSchema,
  rewardContextSchema,
  rewardModifierSchema,
} from "../zod/schemas/rewards";

type RewardContext = z.infer<typeof rewardContextSchema>;
type RewardCondition = z.infer<typeof rewardConditionSchema>;

export const evaluateRewardRules = ({
  modifier,
  context,
}: {
  modifier: Prisma.JsonValue;
  context: RewardContext;
}) => {
  if (!modifier || !context) {
    return null;
  }

  const parsedModifier = rewardModifierSchema.parse(modifier);

  const conditionsMet = parsedModifier.conditions.every((condition) => {
    let fieldValue = undefined;

    if (condition.type === "customer") {
      fieldValue = context.customer?.[condition.field];
    } else if (condition.type === "sale") {
      fieldValue = context.sale?.[condition.field];
    }

    if (fieldValue === undefined) {
      return false;
    }

    return evaluateCondition({
      condition,
      fieldValue,
    });
  });

  return conditionsMet ? parsedModifier.amount : null;
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
    case "greater_than":
      if (
        typeof fieldValue === "number" &&
        typeof condition.value === "number"
      ) {
        return fieldValue > condition.value;
      }
      return false;
    case "less_than":
      if (
        typeof fieldValue === "number" &&
        typeof condition.value === "number"
      ) {
        return fieldValue < condition.value;
      }
      return false;
    case "greater_than_or_equal":
      if (
        typeof fieldValue === "number" &&
        typeof condition.value === "number"
      ) {
        return fieldValue >= condition.value;
      }
      return false;
    case "less_than_or_equal":
      if (
        typeof fieldValue === "number" &&
        typeof condition.value === "number"
      ) {
        return fieldValue <= condition.value;
      }
      return false;
    default:
      return false;
  }
};
