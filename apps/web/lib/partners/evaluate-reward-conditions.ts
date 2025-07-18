import { z } from "zod";

export const rewardConditionSchema = z.object({
  entity: z.enum(["customer", "sale"]),
  attribute: z.enum(["country", "productId"]),
  operator: z.enum([
    "equals_to",
    "not_equals",
    "starts_with",
    "ends_with",
    "in",
    "not_in",
  ]),
  value: z.union([
    z.string(),
    z.number(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
});

export const rewardConditionsSchema = z.object({
  operator: z.enum(["AND", "OR"]).default("AND"),
  conditions: z.array(rewardConditionSchema).min(1),
  amount: z.number().int().min(0),
});

export const rewardConditionsArraySchema = z
  .array(rewardConditionsSchema)
  .min(1);

// rewardConditionSchema -> rewardConditionsSchema -> rewardConditionsArraySchema

export const rewardContextSchema = z.object({
  customer: z
    .object({
      country: z.string().nullish(),
    })
    .optional(),

  sale: z
    .object({
      productId: z.string().nullish(),
    })
    .optional(),
});

export type RewardContext = z.infer<typeof rewardContextSchema>;
export type RewardCondition = z.infer<typeof rewardConditionSchema>;
export type RewardConditions = z.infer<typeof rewardConditionsSchema>;
export type RewardConditionsArray = z.infer<typeof rewardConditionsArraySchema>;

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

    console.log("conditionGroup", {
      conditionGroup,
      conditionResults,
      conditionsMet,
    });

    // If this condition group matches, return it
    if (conditionsMet) {
      return conditionGroup;
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
