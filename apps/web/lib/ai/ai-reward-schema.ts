import {
  CONDITION_OPERATORS,
  REWARD_CONDITIONS,
} from "@/lib/zod/schemas/rewards";
import { RewardStructure } from "@prisma/client";
import * as z from "zod/v4";

const aiRewardConditionSchema = z.object({
  entity: z
    .enum(["partner", "customer", "sale", "lead"])
    .describe("The entity to evaluate (customer, partner, sale, or lead)."),
  attribute: z
    .string()
    .describe("The attribute on the entity (e.g. country, amount, source)."),
  operator: z
    .enum(CONDITION_OPERATORS)
    .describe("Comparison operator for the condition."),
  value: z
    .union([z.string(), z.number(), z.array(z.string()), z.array(z.number())])
    .describe(
      "Condition value. For currency attributes use dollars (not cents). For country use ISO country codes (e.g. US). For enums use the option id.",
    ),
  label: z
    .string()
    .nullish()
    .describe(
      "Optional display label for the reward (e.g. product name for productId).",
    ),
  metadataField: z
    .string()
    .optional()
    .describe("Required when attribute is metadata — the metadata key name."),
});

const aiRewardModifierSchema = z
  .object({
    operator: z
      .enum(["AND", "OR"])
      .default("AND")
      .describe("How conditions in this group combine."),
    conditions: z
      .array(aiRewardConditionSchema)
      .min(1)
      .describe("Conditions that must match for this alternate reward."),
    type: z
      .enum(RewardStructure)
      .optional()
      .describe(
        "Reward structure for this group. Omit to inherit the base reward type.",
      ),
    amount: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        "Reward amount for this group. Flat = dollars; percentage = 0–100. Omit to inherit base amount.",
      ),
    maxDuration: z
      .number()
      .int()
      .nonnegative()
      .nullable()
      .optional()
      .describe(
        "Duration in months for sale rewards. null = lifetime. Omit to inherit base.",
      ),
  })
  .refine(
    (data) =>
      data.type !== "percentage" || data.amount == null || data.amount <= 100,
    {
      message: "Percentage amount must be between 0 and 100.",
      path: ["amount"],
    },
  );

/** AI output schema — amounts in form units (dollars for flat, percent for percentage). */
const aiRewardSchema = z
  .object({
    type: z
      .enum(RewardStructure)
      .describe(
        "Base reward structure. Click and lead rewards must be flat. Sale may be flat or percentage.",
      ),
    amount: z
      .number()
      .nonnegative()
      .describe(
        "Base reward amount. Flat = dollars (e.g. 10 for $10); percentage = 0–100 (e.g. 20 for 20%).",
      ),
    maxDuration: z
      .number()
      .int()
      .nonnegative()
      .nullish()
      .describe(
        "Base duration in months for sale rewards. null = customer's lifetime. One-time sale rewards must be 0, same as click and lead rewards.",
      ),
    modifiers: z
      .array(aiRewardModifierSchema)
      .optional()
      .describe(
        "Optional conditional reward groups. Omit or use [] when there are no conditions.",
      ),
  })
  .refine((data) => data.type !== "percentage" || data.amount <= 100, {
    message: "Percentage amount must be between 0 and 100.",
    path: ["amount"],
  })
  .refine(
    (data) =>
      (data.modifiers ?? []).every((modifier) => {
        const type = modifier.type ?? data.type;
        return (
          type !== "percentage" ||
          modifier.amount == null ||
          modifier.amount <= 100
        );
      }),
    {
      message: "Percentage amount must be between 0 and 100.",
      path: ["modifiers"],
    },
  );

export type AIRewardDraft = z.infer<typeof aiRewardSchema>;

export function getAIRewardSchema(event: "click" | "lead" | "sale") {
  const schema =
    event === "sale"
      ? aiRewardSchema
      : aiRewardSchema
          .refine((data) => data.type === "flat", {
            message: "Click and lead rewards must be flat.",
            path: ["type"],
          })
          .refine((data) => data.maxDuration === 0, {
            message: "Click and lead rewards must use duration 0.",
            path: ["maxDuration"],
          })
          .refine(
            (data) =>
              (data.modifiers ?? []).every(
                (modifier) =>
                  (modifier.type == null || modifier.type === "flat") &&
                  (modifier.maxDuration == null || modifier.maxDuration === 0),
              ),
            {
              message: "Click and lead modifiers must be flat with duration 0.",
              path: ["modifiers"],
            },
          );

  return schema.superRefine((data, ctx) => {
    data.modifiers?.forEach((modifier, modifierIndex) => {
      modifier.conditions.forEach((condition, conditionIndex) => {
        const entity = REWARD_CONDITIONS[event].entities.find(
          (entry) => entry.id === condition.entity,
        );
        const attribute = entity?.attributes.find(
          (entry) => entry.id === condition.attribute,
        );
        const valid =
          attribute != null &&
          (attribute.type !== "metadata" || condition.metadataField);

        if (valid) return;

        ctx.addIssue({
          code: "custom",
          message: `Condition uses an entity/attribute not allowed for ${event} rewards.`,
          path: ["modifiers", modifierIndex, "conditions", conditionIndex],
        });
      });
    });
  });
}
